package com.deepak.cointrailapi.dashboard;

import com.deepak.cointrailapi.account.*;
import com.deepak.cointrailapi.budget.*;
import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.common.security.JwtService;
import com.deepak.cointrailapi.recurringtransaction.*;
import com.deepak.cointrailapi.transaction.*;
import com.deepak.cointrailapi.user.*;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.*;
import java.time.*;
import java.util.*;
import static com.deepak.cointrailapi.dashboard.DashboardFixtures.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc @Testcontainers @ActiveProfiles("test")
class DashboardIntegrationTest {
    @Container @ServiceConnection static PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17-alpine");
    @Autowired MockMvc mvc; @Autowired ObjectMapper mapper; @Autowired JwtService jwt;
    @Autowired UserRepository users; @Autowired AccountRepository accounts; @Autowired CategoryRepository categories;
    @Autowired TransactionRepository transactions; @Autowired BudgetRepository budgets;
    @Autowired RecurringTransactionRepository recurring; @Autowired RecurringTransactionOccurrenceRepository occurrences;
    @Autowired RecurringTransactionGenerationWorker worker; @Autowired DashboardService service;
    @Autowired EntityManagerFactory emf; @Autowired JdbcTemplate jdbc;
    @MockitoBean(name="recurringClock") Clock clock;
    User owner; Account active; Category expense; Category income;
    final LocalDate today=LocalDate.of(2024,2,1);
    @BeforeEach void setup() {
        clean();when(clock.getZone()).thenReturn(ZoneId.of("UTC"));when(clock.instant()).thenReturn(today.atStartOfDay(ZoneOffset.UTC).toInstant());
        owner=user(users);active=account(accounts,owner,"100.10",true);expense=category(categories,owner,CategoryType.EXPENSE);income=category(categories,owner,CategoryType.INCOME);
    }
    @AfterEach void clean() {
        SecurityContextHolder.clearContext();occurrences.deleteAll();recurring.deleteAll();budgets.deleteAll();transactions.deleteAll();accounts.deleteAll();
        categories.findAll().stream().filter(c->!c.isSystem()).forEach(categories::delete);users.deleteAll();
    }
    JsonNode dashboard(User u,int year,int month) throws Exception {
        return mapper.readTree(mvc.perform(get("/api/dashboard").param("year",""+year).param("month",""+month).header("Authorization","Bearer "+jwt.generateToken(u)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    void money(JsonNode root,String pointer,String amount) { assertThat(root.at(pointer).decimalValue()).isEqualByComparingTo(amount); }
    @Test void authenticatedSummaryUsesLiveOwnerActualsAndExistingBudgetSemantics() throws Exception {
        User other=user(users);Account otherAccount=account(accounts,other,"999",true);
        Category equalCategory=category(categories,owner,CategoryType.EXPENSE),unbudgeted=category(categories,owner,CategoryType.EXPENSE);
        transaction(transactions,owner,active,income,"50.25",today);transaction(transactions,owner,active,expense,"125.55",today);
        transaction(transactions,owner,active,equalCategory,"100",today);transaction(transactions,owner,active,unbudgeted,"1.23",today);
        transaction(transactions,other,otherAccount,expense,"900",today);
        budget(budgets,owner,expense,"100",2024,2);budget(budgets,owner,equalCategory,"100",2024,2);
        var result=dashboard(owner,2024,2);
        money(result,"/totalActiveAccountBalance","-76.43");money(result,"/monthlySummary/income","50.25");money(result,"/monthlySummary/expense","226.78");money(result,"/monthlySummary/netCashFlow","-176.53");
        money(result,"/budgetSummary/spentOnBudgetedCategories","225.55");money(result,"/budgetSummary/remainingBudgetAmount","-25.55");assertThat(result.at("/budgetSummary/overBudgetCount").asInt()).isEqualTo(1);
        assertThat(result.get("recentTransactions")).hasSize(4);assertThat(result.has("userId")).isFalse();
        money(dashboard(other,2024,2),"/monthlySummary/expense","900");
    }
    @Test void requiresJwtAndReturnsZeroForOwnerWithoutFinancialData() throws Exception {
        mvc.perform(get("/api/dashboard?year=2024&month=2")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/dashboard?year=2024&month=2").header("Authorization","Bearer invalid")).andExpect(status().isUnauthorized());
        User empty=user(users);var result=dashboard(empty,2024,2);
        money(result,"/totalActiveAccountBalance","0");assertThat(result.get("recentTransactions")).isEmpty();assertThat(result.at("/pendingRecurringTransactions/items")).isEmpty();
    }
    @Test void periodDoesNotChangeBalanceOrCurrentPreviewsAndFutureMonthsContainActualsOnly() throws Exception {
        transaction(transactions,owner,active,expense,"2",LocalDate.of(2023,1,1));
        transaction(transactions,owner,active,income,"3",LocalDate.of(2090,1,1));
        recurring(recurring,owner,active,expense,today.plusDays(10),RecurringTransactionStatus.ACTIVE);
        budget(budgets,owner,expense,"100",2090,1);
        var past=dashboard(owner,2023,1);var current=dashboard(owner,2024,2);var future=dashboard(owner,2090,1);
        for(var result:List.of(past,current,future)) {money(result,"/totalActiveAccountBalance","101.10");assertThat(result.get("recentTransactions")).isEqualTo(current.get("recentTransactions"));assertThat(result.get("pendingRecurringTransactions")).isEqualTo(current.get("pendingRecurringTransactions"));}
        money(past,"/monthlySummary/expense","2");money(current,"/monthlySummary/expense","0");money(future,"/monthlySummary/income","3");money(future,"/monthlySummary/expense","0");money(future,"/budgetSummary/totalBudgetAmount","100");
    }
    @Test void pendingPreviewIncludesBlockedOverdueAndTodayButNotPausedOrBeyondHorizon() throws Exception {
        recurring(recurring,owner,active,expense,today.minusDays(1),RecurringTransactionStatus.BLOCKED);
        recurring(recurring,owner,active,income,today,RecurringTransactionStatus.ACTIVE);
        recurring(recurring,owner,active,expense,today.plusDays(30),RecurringTransactionStatus.ACTIVE);
        recurring(recurring,owner,active,expense,today.plusDays(31),RecurringTransactionStatus.ACTIVE);
        recurring(recurring,owner,active,expense,today,RecurringTransactionStatus.PAUSED);
        active.setActive(false);accounts.saveAndFlush(active);expense.setActive(false);categories.saveAndFlush(expense);
        var result=dashboard(owner,2024,2);var items=result.at("/pendingRecurringTransactions/items");
        assertThat(items).hasSize(3);assertThat(items.get(0).get("status").asText()).isEqualTo("BLOCKED");assertThat(items.get(0).get("overdue").asBoolean()).isTrue();
        assertThat(items.get(1).get("overdue").asBoolean()).isFalse();assertThat(items.get(1).get("blockedReason").isNull()).isTrue();
        assertThat(result.at("/pendingRecurringTransactions/throughDate").asText()).isEqualTo("2024-03-02");
        money(result,"/monthlySummary/expense","0");
    }
    @Test void generatedActualIsCountedOnceAndDeletionDoesNotReplayOrMutateOnGet() throws Exception {
        var template=recurring(recurring,owner,active,expense,today,RecurringTransactionStatus.ACTIVE);
        budget(budgets,owner,expense,"100",2024,2);
        money(dashboard(owner,2024,2),"/monthlySummary/expense","0");assertThat(worker.process(template.getId())).isEqualTo(1);
        money(dashboard(owner,2024,2),"/monthlySummary/expense","10");money(dashboard(owner,2024,2),"/budgetSummary/spentOnBudgetedCategories","10");
        long tx=transactions.findAll().getFirst().getId();
        mvc.perform(delete("/api/transactions/{id}",tx).header("Authorization","Bearer "+jwt.generateToken(owner))).andExpect(status().isNoContent());
        LocalDate cursor=recurring.findById(template.getId()).orElseThrow().getNextDueDate();
        money(dashboard(owner,2024,2),"/monthlySummary/expense","0");
        assertThat(recurring.findById(template.getId()).orElseThrow().getNextDueDate()).isEqualTo(cursor);assertThat(occurrences.count()).isEqualTo(1);
        jdbc.update("update recurring_transactions set next_due_date=? where id=?",today,template.getId());
        assertThat(worker.process(template.getId())).isZero();assertThat(transactions.count()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from recurring_transaction_occurrences where transaction_id is null",Long.class)).isEqualTo(1);
    }
    @Test void transactionEditsReassignmentAndDeactivationAreReflectedImmediately() throws Exception {
        var tx=transaction(transactions,owner,active,expense,"10",today);budget(budgets,owner,expense,"100",2024,2);
        Account second=account(accounts,owner,"-20",true);
        mvc.perform(put("/api/transactions/{id}",tx.getId()).header("Authorization","Bearer "+jwt.generateToken(owner)).contentType("application/json")
            .content(mapper.writeValueAsString(Map.of("accountId",second.getId(),"categoryId",expense.getId(),"type","EXPENSE","amount",25,"transactionDate","2024-01-31")))).andExpect(status().isOk());
        var result=dashboard(owner,2024,2);money(result,"/monthlySummary/expense","0");money(result,"/budgetSummary/spentOnBudgetedCategories","0");money(result,"/totalActiveAccountBalance","55.10");
        second.setActive(false);accounts.saveAndFlush(second);expense.setActive(false);categories.saveAndFlush(expense);
        result=dashboard(owner,2024,1);money(result,"/totalActiveAccountBalance","100.10");money(result,"/monthlySummary/expense","25");assertThat(result.get("recentTransactions")).hasSize(1);
    }
    @Test void queryCountStaysBoundedAsLedgerAndPreviewRowsGrowAndGetDoesNotWrite() {
        budget(budgets,owner,expense,"100",2024,2);transaction(transactions,owner,active,expense,"1",today);
        recurring(recurring,owner,active,expense,today,RecurringTransactionStatus.ACTIVE);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(owner,null,owner.getAuthorities()));
        var stats=emf.unwrap(SessionFactory.class).getStatistics();stats.clear();service.getDashboard(2024,2);long small=stats.getPrepareStatementCount();
        for(int i=0;i<20;i++) {transaction(transactions,owner,account(accounts,owner,"0",true),category(categories,owner,CategoryType.EXPENSE),"1",today);recurring(recurring,owner,active,expense,today,RecurringTransactionStatus.ACTIVE);}
        stats.clear();var result=service.getDashboard(2024,2);
        assertThat(stats.getPrepareStatementCount()).isEqualTo(small).isEqualTo(7);
        assertThat(stats.getEntityInsertCount()).isZero();assertThat(stats.getEntityUpdateCount()).isZero();assertThat(stats.getEntityDeleteCount()).isZero();
        assertThat(result.recentTransactions()).hasSize(5);assertThat(result.pendingRecurringTransactions().items()).hasSize(5);
        assertThat(stats.getEntityLoadCount()).isLessThanOrEqualTo(40);
    }
    @Test void inspectRepresentativeQueryPlansUsingExistingIndexes() {
        // Representative owner history and pending templates, without adding performance infrastructure.
        jdbc.update("""
            insert into transactions(user_id,account_id,category_id,type,amount,transaction_date,created_at,updated_at)
            select ?,?,?,'EXPENSE',1.23,date '2020-01-01'+(n % 2000),timestamp '2024-01-01',timestamp '2024-01-01'
            from generate_series(1,5000) n
            """,owner.getId(),active.getId(),expense.getId());
        jdbc.update("""
            insert into recurring_transactions(user_id,account_id,category_id,type,amount,frequency,start_date,next_due_date,status,created_at,updated_at)
            select ?,?,?,'EXPENSE',10,'MONTHLY',date '2024-01-01',date '2024-01-01'+(n % 60),'ACTIVE',timestamp '2024-01-01',timestamp '2024-01-01'
            from generate_series(1,1000) n
            """,owner.getId(),active.getId(),expense.getId());
        jdbc.execute("analyze transactions");jdbc.execute("analyze accounts");jdbc.execute("analyze recurring_transactions");
        List<String> statements=List.of(
            "select type,sum(amount) from transactions where user_id="+owner.getId()+" and transaction_date>=date '2024-02-01' and transaction_date<date '2024-03-01' group by type",
            "select sum(case when t.type='INCOME' then t.amount else -t.amount end) from transactions t join accounts a on a.id=t.account_id where t.user_id="+owner.getId()+" and a.user_id="+owner.getId()+" and a.active=true",
            "select t.id,a.name,c.name from transactions t join accounts a on a.id=t.account_id join categories c on c.id=t.category_id where t.user_id="+owner.getId()+" order by t.transaction_date desc,t.created_at desc,t.id desc limit 5",
            "select r.id,a.name,c.name from recurring_transactions r join accounts a on a.id=r.account_id join categories c on c.id=r.category_id where r.user_id="+owner.getId()+" and r.status in ('ACTIVE','BLOCKED') and r.next_due_date<=date '2024-03-02' order by r.next_due_date,r.id limit 5");
        for(String statement:statements) {
            var plan=jdbc.queryForList("explain (analyze,buffers) "+statement,String.class);
            assertThat(plan).isNotEmpty();System.out.println("Dashboard query plan: "+statement+"\n"+String.join("\n",plan));
        }
    }
    @Test void recurringMetadataUsesItsZoneAndMaximumPeriodWorksWithBudgetQuery() throws Exception {
        when(clock.getZone()).thenReturn(ZoneId.of("Pacific/Kiritimati"));when(clock.instant()).thenReturn(Instant.parse("2024-02-01T10:30:00Z"));
        assertThat(dashboard(owner,2024,2).at("/pendingRecurringTransactions/asOfDate").asText()).isEqualTo("2024-02-02");
        budget(budgets,owner,expense,"100",9999,12);transaction(transactions,owner,active,expense,"1",LocalDate.of(9999,12,31));
        money(dashboard(owner,9999,12),"/monthlySummary/expense","1");money(dashboard(owner,9999,12),"/budgetSummary/spentOnBudgetedCategories","1");
    }
}
