package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.account.AccountRepository;
import com.deepak.cointrailapi.category.CategoryRepository;
import com.deepak.cointrailapi.transaction.*;
import com.deepak.cointrailapi.user.UserRepository;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static com.deepak.cointrailapi.recurringtransaction.RecurringTestFixtures.*;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
class RecurringTransactionRepositoryTest {
    @Container @ServiceConnection static PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17-alpine");
    @Autowired RecurringTransactionRepository templates;
    @Autowired RecurringTransactionOccurrenceRepository occurrences;
    @Autowired TransactionRepository transactions;
    @Autowired UserRepository users; @Autowired AccountRepository accounts; @Autowired CategoryRepository categories;
    @Autowired EntityManager em; @Autowired JdbcTemplate jdbc;
    private RecurringTransaction fixture() {
        var u=user(users);var a=account(accounts,u);
        var c=categories.findAll().stream().filter(v -> v.isSystem() && v.getName().equals("Food")).findFirst().orElseThrow();
        return template(u,a,c,LocalDate.of(2024,1,1));
    }
    @Test void shouldRoundTripFilterByOwnerAndAllowIdenticalTemplates() {
        var r=fixture();templates.saveAndFlush(r);var copy=template(r.getUser(),r.getAccount(),r.getCategory(),r.getStartDate());templates.saveAndFlush(copy);
        var other=user(users);Long id=r.getId();em.clear();
        assertThat(templates.findByIdAndUserId(id,other.getId())).isEmpty();
        var loaded=templates.findByIdAndUserId(id,r.getUser().getId()).orElseThrow();
        assertThat(loaded.getAccount().getName()).isEqualTo(r.getAccount().getName());assertThat(loaded.getAmount()).isEqualByComparingTo("10.00");
        var page=templates.findAll(RecurringTransactionSpecification.ownedAndFiltered(r.getUser().getId(),RecurringTransactionStatus.ACTIVE,
            TransactionType.EXPENSE,r.getAccount().getId(),r.getCategory().getId()),PageRequest.of(0,1,Sort.by("id")));
        assertThat(page.getTotalElements()).isEqualTo(2);assertThat(page.getContent()).hasSize(1);
        assertThat(templates.findAll(RecurringTransactionSpecification.ownedAndFiltered(other.getId(),null,null,null,null),PageRequest.of(0,20))).isEmpty();
    }
    @Test void shouldDiscoverBlockedAndActiveWithKeysetButExcludePausedTerminalAndFuture() {
        var r=fixture();templates.saveAndFlush(r);
        var blocked=template(r.getUser(),r.getAccount(),r.getCategory(),r.getStartDate());blocked.setStatus(RecurringTransactionStatus.BLOCKED);blocked.setBlockedReason("Account is inactive");templates.saveAndFlush(blocked);
        for (var status:List.of(RecurringTransactionStatus.PAUSED,RecurringTransactionStatus.CANCELLED,RecurringTransactionStatus.COMPLETED)) {
            var v=template(r.getUser(),r.getAccount(),r.getCategory(),r.getStartDate());v.setStatus(status);
            if (status!=RecurringTransactionStatus.PAUSED) v.setNextDueDate(null);templates.saveAndFlush(v);
        }
        var future=template(r.getUser(),r.getAccount(),r.getCategory(),LocalDate.of(2024,2,1));templates.saveAndFlush(future);
        var first=templates.findCandidates(LocalDate.of(2024,1,1),LocalDate.of(1,1,1),0L,PageRequest.of(0,1));
        assertThat(first).extracting(RecurringTransactionRepository.Candidate::getId).containsExactly(r.getId());
        var next=templates.findCandidates(LocalDate.of(2024,1,1),first.getFirst().getNextDueDate(),r.getId(),PageRequest.of(0,10));
        assertThat(next).extracting(RecurringTransactionRepository.Candidate::getId).containsExactly(blocked.getId());
    }
    @ParameterizedTest @CsvSource({
        "amount,0,chk_recurring_amount", "amount,-1,chk_recurring_amount",
        "type,'TRANSFER',chk_recurring_type", "frequency,'HOURLY',chk_recurring_frequency",
        "status,'INVALID',chk_recurring_cursor", "end_date,'2023-12-31',chk_recurring_dates",
        "next_due_date,NULL,chk_recurring_cursor", "blocked_reason,'bad',chk_recurring_blocked_reason",
        "start_date,'0001-01-01 BC',chk_recurring_dates", "next_due_date,'10000-01-01',chk_recurring_dates"
    })
    void shouldEnforceChecksInPostgres(String column,String value,String constraint) {
        var r=templates.saveAndFlush(fixture());
        String literal = column.equals("amount") || value.equals("NULL") ? value : "'" + value + "'";
        assertThatThrownBy(() -> jdbc.update("UPDATE recurring_transactions SET "+column+"="+literal+" WHERE id=?",r.getId()))
            .isInstanceOf(DataIntegrityViolationException.class).hasStackTraceContaining(constraint);
    }
    @ParameterizedTest @ValueSource(strings={"user_id","account_id","category_id","type","amount","frequency","start_date","status","created_at","updated_at"})
    void shouldEnforceRequiredColumns(String column) {
        var r=templates.saveAndFlush(fixture());
        assertThatThrownBy(() -> jdbc.update("UPDATE recurring_transactions SET "+column+"=NULL WHERE id=?",r.getId()))
            .isInstanceOf(DataIntegrityViolationException.class).hasStackTraceContaining(column);
    }
    @ParameterizedTest @ValueSource(strings={"user_id","account_id","category_id"})
    void shouldEnforceForeignKeys(String column) {
        var r=templates.saveAndFlush(fixture());
        assertThatThrownBy(() -> jdbc.update("UPDATE recurring_transactions SET "+column+"=? WHERE id=?",Long.MAX_VALUE,r.getId()))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
    @Test void shouldEnforceNumericOverflow() {
        var r=fixture();r.setAmount(new BigDecimal("100000000000000000"));
        assertThatThrownBy(() -> templates.saveAndFlush(r)).isInstanceOf(DataIntegrityViolationException.class);
    }
    @Test void shouldRetainOccurrenceWhenTransactionDeletedAndPreventDuplicate() {
        var r=templates.saveAndFlush(fixture());var t=new Transaction();t.setUser(r.getUser());t.setAccount(r.getAccount());t.setCategory(r.getCategory());
        t.setType(TransactionType.EXPENSE);t.setAmount(r.getAmount());t.setTransactionDate(r.getStartDate());t.setCreatedAt(LocalDateTime.now());t.setUpdatedAt(LocalDateTime.now());transactions.saveAndFlush(t);
        var o=new RecurringTransactionOccurrence();o.setRecurringTransaction(r);o.setScheduledDate(r.getStartDate());o.setTransaction(t);o.setPostedAt(LocalDateTime.now());occurrences.saveAndFlush(o);
        em.clear();transactions.deleteById(t.getId());transactions.flush();em.clear();
        assertThat(occurrences.findById(o.getId()).orElseThrow().getTransaction()).isNull();
        assertThat(occurrences.existsByRecurringTransactionIdAndScheduledDate(r.getId(),r.getStartDate())).isTrue();
        var duplicate=new RecurringTransactionOccurrence();duplicate.setRecurringTransaction(r);duplicate.setScheduledDate(r.getStartDate());duplicate.setPostedAt(LocalDateTime.now());
        assertThatThrownBy(() -> occurrences.saveAndFlush(duplicate)).isInstanceOf(DataIntegrityViolationException.class).hasStackTraceContaining("uq_recurring_occurrence");
    }
    @ParameterizedTest @ValueSource(strings={"recurring_transaction_id","scheduled_date","posted_at"})
    void shouldEnforceRequiredOccurrenceColumns(String missing) {
        var r=templates.saveAndFlush(fixture());
        Object[] values={r.getId(),r.getStartDate(),LocalDateTime.now()};
        values[List.of("recurring_transaction_id","scheduled_date","posted_at").indexOf(missing)]=null;
        assertThatThrownBy(() -> jdbc.update("INSERT INTO recurring_transaction_occurrences (recurring_transaction_id,scheduled_date,posted_at) VALUES (?,?,?)",values))
            .isInstanceOf(DataIntegrityViolationException.class).hasStackTraceContaining(missing);
    }
    @ParameterizedTest @ValueSource(strings={"template","transaction"})
    void shouldEnforceOccurrenceForeignKeys(String missing) {
        var r=templates.saveAndFlush(fixture());
        assertThatThrownBy(() -> jdbc.update("INSERT INTO recurring_transaction_occurrences (recurring_transaction_id,scheduled_date,transaction_id,posted_at) VALUES (?,?,?,CURRENT_TIMESTAMP)",
            missing.equals("template")?Long.MAX_VALUE:r.getId(),r.getStartDate(),missing.equals("transaction")?Long.MAX_VALUE:null))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
    @Test void shouldRejectOneTransactionLinkedToDifferentOccurrences() {
        var r=templates.saveAndFlush(fixture());var t=new Transaction();t.setUser(r.getUser());t.setAccount(r.getAccount());t.setCategory(r.getCategory());
        t.setType(TransactionType.EXPENSE);t.setAmount(r.getAmount());t.setTransactionDate(r.getStartDate());t.setCreatedAt(LocalDateTime.now());t.setUpdatedAt(LocalDateTime.now());transactions.saveAndFlush(t);
        jdbc.update("INSERT INTO recurring_transaction_occurrences (recurring_transaction_id,scheduled_date,transaction_id,posted_at) VALUES (?,?,?,CURRENT_TIMESTAMP)",r.getId(),r.getStartDate(),t.getId());
        assertThatThrownBy(() -> jdbc.update("INSERT INTO recurring_transaction_occurrences (recurring_transaction_id,scheduled_date,transaction_id,posted_at) VALUES (?,?,?,CURRENT_TIMESTAMP)",r.getId(),r.getStartDate().plusDays(1),t.getId()))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
    @Test void shouldPersistMaximumMonetaryValueWithoutRounding() {
        var r=fixture();r.setAmount(new BigDecimal("99999999999999999.99"));Long id=templates.saveAndFlush(r).getId();em.clear();
        assertThat(templates.findById(id).orElseThrow().getAmount()).isEqualByComparingTo("99999999999999999.99");
    }
    @Test void shouldMigrateExistingV11SchemaWithoutLosingData() {
        String schema="upgrade_"+UUID.randomUUID().toString().replace("-","");
        var config=Flyway.configure().dataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()).schemas(schema).defaultSchema(schema);
        var previous=config.target("11").load();assertThat(previous.migrate().migrationsExecuted).isEqualTo(11);
        var upgraded=Flyway.configure().dataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()).schemas(schema).defaultSchema(schema).load();
        assertThat(upgraded.migrate().migrationsExecuted).isEqualTo(1);upgraded.validate();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM "+schema+".categories",Long.class)).isEqualTo(15);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM "+schema+".recurring_transactions",Long.class)).isZero();
    }
}
