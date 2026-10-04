package com.deepak.cointrailapi.dashboard;

import com.deepak.cointrailapi.account.*;
import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.transaction.*;
import com.deepak.cointrailapi.recurringtransaction.*;
import com.deepak.cointrailapi.user.*;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import java.time.*;
import static com.deepak.cointrailapi.dashboard.DashboardFixtures.*;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties="spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers @ActiveProfiles("test")
class DashboardRepositoryTest {
    @Container @ServiceConnection static PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17-alpine");
    @Autowired UserRepository users; @Autowired AccountRepository accounts; @Autowired CategoryRepository categories;
    @Autowired TransactionRepository transactions; @Autowired RecurringTransactionRepository recurring;
    @Autowired EntityManager em;
    @Test void balanceAggregatesAreOwnerScopedAndDoNotMultiplyOpeningBalances() {
        User owner=user(users),other=user(users);Category expense=category(categories,owner,CategoryType.EXPENSE),income=category(categories,owner,CategoryType.INCOME);
        Account active=account(accounts,owner,"-100.10",true),empty=account(accounts,owner,"50.00",true),inactive=account(accounts,owner,"1000",false),foreign=account(accounts,other,"9999",true);
        transaction(transactions,owner,active,expense,"10.10",LocalDate.of(2023,1,1));
        transaction(transactions,owner,active,income,"20.20",LocalDate.of(2090,1,1));
        transaction(transactions,owner,inactive,expense,"200",LocalDate.of(2024,2,1));
        transaction(transactions,other,foreign,expense,"900",LocalDate.of(2024,2,1));
        // Independent predicates also reject an inconsistent cross-owner account association.
        transaction(transactions,owner,foreign,expense,"800",LocalDate.of(2024,2,1));
        assertThat(accounts.sumActiveOpeningBalances(owner.getId())).isEqualByComparingTo("-50.10");
        assertThat(transactions.sumActiveAccountNetFlow(owner.getId())).isEqualByComparingTo("10.10");
        assertThat(accounts.sumActiveOpeningBalances(-1L)).isNull();
        assertThat(transactions.sumActiveAccountNetFlow(-1L)).isNull();
    }
    @Test void monthlyAggregatesUseHalfOpenDatesAndRetainInactiveHistory() {
        User owner=user(users),other=user(users);Account a=account(accounts,owner,"0",false);Category c=category(categories,owner,CategoryType.EXPENSE);c.setActive(false);categories.saveAndFlush(c);
        for(LocalDate date: java.util.List.of(LocalDate.of(2024,1,31),LocalDate.of(2024,2,1),LocalDate.of(2024,2,29),LocalDate.of(2024,3,1))) transaction(transactions,owner,a,c,"1.23",date);
        transaction(transactions,other,account(accounts,other,"0",true),c,"99",LocalDate.of(2024,2,2));
        var totals=transactions.sumByTypeForPeriod(owner.getId(),LocalDate.of(2024,2,1),LocalDate.of(2024,3,1));
        assertThat(totals).hasSize(1);assertThat(totals.getFirst().getType()).isEqualTo(TransactionType.EXPENSE);assertThat(totals.getFirst().getTotalAmount()).isEqualByComparingTo("2.46");
        assertThat(transactions.sumByTypeForPeriod(owner.getId(),LocalDate.of(2025,2,1),LocalDate.of(2025,3,1))).isEmpty();
    }
    @Test void postgresSupportsMaximumMonthBoundaryAndAggregatePrecisionBeyondRowLimit() {
        User u=user(users);Account a=account(accounts,u,"99999999999999999.99",true);account(accounts,u,"99999999999999999.99",true);Category c=category(categories,u,CategoryType.INCOME);
        transaction(transactions,u,a,c,"99999999999999999.99",LocalDate.of(9999,12,1));transaction(transactions,u,a,c,"99999999999999999.99",LocalDate.of(9999,12,31));
        transaction(transactions,u,a,c,"1.23",LocalDate.of(1,1,1));
        assertThat(transactions.sumByTypeForPeriod(u.getId(),LocalDate.of(1,1,1),LocalDate.of(1,2,1)).getFirst().getTotalAmount()).isEqualByComparingTo("1.23");
        assertThat(accounts.sumActiveOpeningBalances(u.getId())).isEqualByComparingTo("199999999999999999.98");
        assertThat(transactions.sumByTypeForPeriod(u.getId(),LocalDate.of(9999,12,1),LocalDate.of(10000,1,1)).getFirst().getTotalAmount()).isEqualByComparingTo("199999999999999999.98");
    }
    @Test void recentPreviewIsBoundedDeterministicAndFetchesNamesWithoutCountOrNPlusOne() {
        User u=user(users);Category c=category(categories,u,CategoryType.EXPENSE);Account a=account(accounts,u,"0",true);
        var older=transaction(transactions,u,a,c,"1",LocalDate.of(2024,1,31));
        var first=transaction(transactions,u,a,c,"1",LocalDate.of(2024,2,1));
        var newerTime=transaction(transactions,u,a,c,"1",LocalDate.of(2024,2,1));newerTime.setCreatedAt(TIME.plusHours(1));transactions.saveAndFlush(newerTime);
        var last=first;
        for(int i=0;i<8;i++) last=transaction(transactions,u,account(accounts,u,"0",true),category(categories,u,CategoryType.EXPENSE),"1",LocalDate.of(2024,2,1));
        em.clear();var stats=em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();stats.clear();
        var rows=transactions.findByUserIdOrderByTransactionDateDescCreatedAtDescIdDesc(u.getId(),PageRequest.of(0,5));
        assertThat(rows).hasSize(5);assertThat(rows.getFirst().getId()).isEqualTo(newerTime.getId());assertThat(rows.get(1).getId()).isEqualTo(last.getId());
        rows.forEach(t->{assertThat(t.getAccount().getName()).isNotBlank();assertThat(t.getCategory().getName()).isNotBlank();});
        assertThat(stats.getPrepareStatementCount()).isEqualTo(1);
    }
    @Test void pendingPreviewFiltersOwnerStatusAndInclusiveWindowButNotInactiveResources() {
        User u=user(users),other=user(users);Account a=account(accounts,u,"0",false);Category c=category(categories,u,CategoryType.EXPENSE);c.setActive(false);categories.saveAndFlush(c);
        LocalDate today=LocalDate.of(2024,2,1),through=today.plusDays(30);
        var overdue=recurring(recurring,u,a,c,today.minusDays(10),RecurringTransactionStatus.BLOCKED);
        var due=recurring(recurring,u,a,c,today,RecurringTransactionStatus.ACTIVE);
        var boundary=recurring(recurring,u,a,c,through,RecurringTransactionStatus.ACTIVE);
        recurring(recurring,u,a,c,through.plusDays(1),RecurringTransactionStatus.ACTIVE);
        for(var state: java.util.List.of(RecurringTransactionStatus.PAUSED,RecurringTransactionStatus.CANCELLED,RecurringTransactionStatus.COMPLETED)) recurring(recurring,u,a,c,today.minusDays(20),state);
        recurring(recurring,other,account(accounts,other,"0",true),c,today.minusDays(30),RecurringTransactionStatus.ACTIVE);
        em.clear();var stats=em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();stats.clear();
        var rows=recurring.findPendingForDashboard(u.getId(),through,PageRequest.of(0,5));
        assertThat(rows).extracting(RecurringTransaction::getId).containsExactly(overdue.getId(),due.getId(),boundary.getId());
        rows.forEach(r->{assertThat(r.getAccount().getName()).isNotBlank();assertThat(r.getCategory().getName()).isNotBlank();});
        assertThat(stats.getPrepareStatementCount()).isEqualTo(1);
    }
    @Test void pendingPreviewLimitsRowsAndBreaksTiesByIdAscending() {
        User u=user(users);Account a=account(accounts,u,"0",true);Category c=category(categories,u,CategoryType.EXPENSE);LocalDate date=LocalDate.of(2024,2,1);
        java.util.List<Long> ids=new java.util.ArrayList<>();for(int i=0;i<8;i++) ids.add(recurring(recurring,u,a,c,date,RecurringTransactionStatus.ACTIVE).getId());
        assertThat(recurring.findPendingForDashboard(u.getId(),date,PageRequest.of(0,5))).extracting(RecurringTransaction::getId).containsExactlyElementsOf(ids.subList(0,5));
    }
}
