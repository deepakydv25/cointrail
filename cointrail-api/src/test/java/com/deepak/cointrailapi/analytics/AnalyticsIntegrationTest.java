package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.account.*;
import com.deepak.cointrailapi.budget.*;
import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.common.security.JwtService;
import com.deepak.cointrailapi.expense.*;
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
import java.math.BigDecimal;
import java.util.*;
import static com.deepak.cointrailapi.analytics.AnalyticsFixtures.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc @Testcontainers @ActiveProfiles("test")
class AnalyticsIntegrationTest {
    @Container @ServiceConnection static PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17-alpine");
    @Autowired MockMvc mvc; @Autowired ObjectMapper mapper; @Autowired JwtService jwt;
    @Autowired UserRepository users; @Autowired AccountRepository accounts; @Autowired CategoryRepository categories;
    @Autowired TransactionRepository transactions; @Autowired BudgetRepository budgets; @Autowired ExpenseRepository expenses;
    @Autowired RecurringTransactionRepository recurring; @Autowired RecurringTransactionOccurrenceRepository occurrences;
    @Autowired RecurringTransactionGenerationWorker worker; @Autowired AnalyticsService service;
    @Autowired EntityManagerFactory emf; @Autowired JdbcTemplate jdbc;
    @MockitoBean(name="recurringClock") Clock clock;
    User owner; Account account; Category expense; Category income;
    final LocalDate today=LocalDate.of(2024,2,1);
    @BeforeEach void setup() {
        clean();when(clock.getZone()).thenReturn(ZoneId.of("UTC"));when(clock.instant()).thenReturn(today.atStartOfDay(ZoneOffset.UTC).toInstant());
        owner=user(users);account=account(accounts,owner,"99999",true);expense=category(categories,owner,CategoryType.EXPENSE);income=category(categories,owner,CategoryType.INCOME);
    }
    @AfterEach void clean() {
        SecurityContextHolder.clearContext();occurrences.deleteAll();recurring.deleteAll();budgets.deleteAll();transactions.deleteAll();expenses.deleteAll();accounts.deleteAll();
        categories.findAll().stream().filter(c->!c.isSystem()).forEach(categories::delete);users.deleteAll();
    }
    JsonNode getAnalytics(User user,String route,String query) throws Exception {
        return mapper.readTree(mvc.perform(get("/api/analytics/"+route+query).header("Authorization","Bearer "+jwt.generateToken(user)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    void money(JsonNode root,String pointer,String amount) {assertThat(root.at(pointer).decimalValue()).isEqualByComparingTo(amount);}
    String query(LocalDate from,LocalDate to) {return "?from="+from+"&to="+to;}
    void bad(String route,String query) throws Exception {mvc.perform(get("/api/analytics/"+route+query).header("Authorization","Bearer "+jwt.generateToken(owner))).andExpect(status().isBadRequest());}

    @Test void ownerIsolationAndReconciliationAcrossAllFiveRoutes() throws Exception {
        User other=user(users);Account foreign=account(accounts,other,"0",true);
        Category shared=categories.findAll().stream().filter(c->c.isSystem()&&c.getType()==CategoryType.EXPENSE).findFirst().orElseThrow();
        transaction(transactions,owner,account,income,"10.01",today);transaction(transactions,owner,account,shared,"20.02",today);
        transaction(transactions,other,foreign,shared,"999",today);
        for(User user:List.of(owner,other)) {
            String expected=user==owner?"20.02":"999";long expectedCount=user==owner?2:1;
            for(String route:List.of("summary","categories","accounts","trends","comparison")) {
                String suffix=route.equals("trends")?"&grouping=DAILY":route.equals("comparison")?"&compareFrom=2024-02-01&compareTo=2024-02-01":"";
                var result=getAnalytics(user,route,query(today,today)+suffix);
                String totals=route.equals("comparison")?"/current/totals":"/totals";
                money(result,totals+"/expense",expected);assertThat(result.at(totals+"/transactionCount").asLong()).isEqualTo(expectedCount);
                if(route.equals("comparison")) {money(result,"/baseline/totals/expense",expected);money(result,"/delta/expense","0");}
                if(List.of("categories","accounts","trends").contains(route)) {
                    long count=0;BigDecimal sum=BigDecimal.ZERO;
                    for(var item:result.get("items")) {count+=item.at("/totals/transactionCount").asLong();sum=sum.add(item.at("/totals/expense").decimalValue());}
                    assertThat(count).isEqualTo(expectedCount);assertThat(sum).isEqualByComparingTo(expected);
                }
                assertThat(result.has("userId")).isFalse();
            }
        }
    }
    @Test void everyEndpointRequiresJwtAndEmptyResultsStay200() throws Exception {
        User empty=user(users);
        for(String route:List.of("summary","categories","accounts","trends","comparison")) {
            String suffix=route.equals("trends")?"&grouping=MONTHLY":route.equals("comparison")?"&compareFrom=2024-02-01&compareTo=2024-02-01":"";
            String q=query(today,today)+suffix;
            mvc.perform(get("/api/analytics/"+route+q)).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/analytics/"+route+q).header("Authorization","Bearer invalid")).andExpect(status().isUnauthorized());
            var result=getAnalytics(empty,route,q);
            if(route.equals("comparison")) {assertThat(result.at("/delta/transactionCount").asLong()).isZero();}
            else {money(result,"/totals/income","0");assertThat(result.at("/totals/transactionCount").asLong()).isZero();}
            if(route.equals("categories")||route.equals("accounts")) assertThat(result.get("items")).isEmpty();
            if(route.equals("trends")) assertThat(result.get("items")).hasSize(1);
        }
    }
    @Test void endpointSpecificCalendarLimitsLeapAnniversariesAndIndependentComparisonSides() throws Exception {
        LocalDate from=LocalDate.of(2020,1,1),last=LocalDate.of(2024,12,31);
        for(String route:List.of("summary","categories","accounts")) {
            assertThat(getAnalytics(owner,route,query(from,last)).at("/range/dayCount").asLong()).isEqualTo(1827);
            bad(route,query(from,last.plusDays(1)));
        }
        getAnalytics(owner,"comparison",query(from,last)+"&compareFrom=2024-02-29&compareTo=2029-02-27");
        bad("comparison",query(from,last)+"&compareFrom=2024-02-29&compareTo=2029-02-28");
        bad("comparison",query(from,last.plusDays(1))+"&compareFrom=2024-02-29&compareTo=2029-02-27");
        getAnalytics(owner,"trends",query(LocalDate.of(2023,1,1),last)+"&grouping=WEEKLY");
        bad("trends",query(LocalDate.of(2023,1,1),last.plusDays(1))+"&grouping=WEEKLY");
        getAnalytics(owner,"trends",query(from,last)+"&grouping=MONTHLY");bad("trends",query(from,last.plusDays(1))+"&grouping=MONTHLY");
        getAnalytics(owner,"trends",query(today,today.plusDays(365))+"&grouping=DAILY");bad("trends",query(today,today.plusDays(366))+"&grouping=DAILY");
        getAnalytics(owner,"trends",query(LocalDate.of(2024,2,29),LocalDate.of(2026,2,27))+"&grouping=WEEKLY");
        bad("trends",query(LocalDate.of(2024,2,29),LocalDate.of(2026,2,28))+"&grouping=WEEKLY");
        bad("summary","?from=0000-01-01&to=0001-01-01");bad("summary",query(today,today.minusDays(1)));
    }
    @Test void trendsClipEdgesZeroFillAndHandleMinimumMaximumAndFutureActuals() throws Exception {
        transaction(transactions,owner,account,expense,"1.23",LocalDate.of(2024,2,29));
        var monthly=getAnalytics(owner,"trends","?from=2024-01-31&to=2024-03-01&grouping=MONTHLY");
        assertThat(monthly.get("items")).hasSize(3);assertThat(monthly.at("/items/0/from").asText()).isEqualTo("2024-01-31");
        assertThat(monthly.at("/items/1/to").asText()).isEqualTo("2024-02-29");money(monthly,"/items/1/totals/expense","1.23");money(monthly,"/items/2/totals/expense","0");
        var weekly=getAnalytics(owner,"trends","?from=2023-12-31&to=2024-01-09&grouping=WEEKLY");
        assertThat(weekly.get("items")).hasSize(3);assertThat(weekly.at("/items/1/from").asText()).isEqualTo("2024-01-01");assertThat(weekly.at("/items/2/to").asText()).isEqualTo("2024-01-09");
        for(LocalDate date:List.of(LocalDate.of(1,1,1),LocalDate.of(9999,12,31))) {
            transaction(transactions,owner,account,income,"2.34",date);
            for(AnalyticsGrouping grouping:AnalyticsGrouping.values()) {
                var result=getAnalytics(owner,"trends",query(date,date)+"&grouping="+grouping);
                assertThat(result.get("items")).hasSize(1);assertThat(result.at("/items/0/from").asText()).isEqualTo(date.toString());money(result,"/items/0/totals/income","2.34");
            }
        }
    }
    @Test void explicitUnequalOverlappingComparisonReturnsRawSignedDeltas() throws Exception {
        transaction(transactions,owner,account,income,"10.01",today);transaction(transactions,owner,account,expense,"20.02",today.plusDays(1));
        var result=getAnalytics(owner,"comparison",query(today,today)+"&compareFrom=2024-02-01&compareTo=2024-02-02");
        money(result,"/delta/income","0");money(result,"/delta/expense","-20.02");money(result,"/delta/netCashFlow","20.02");assertThat(result.at("/delta/transactionCount").asLong()).isEqualTo(-1);
        var empty=getAnalytics(owner,"comparison","?from=2025-01-01&to=2025-01-01&compareFrom=2024-02-01&compareTo=2024-02-02");
        money(empty,"/delta/income","-10.01");money(empty,"/delta/netCashFlow","10.01");
    }
    @Test void ordinaryEditsReassignmentDeactivationAndDeleteChangeCurrentHistoricalAnalysis() throws Exception {
        var tx=transaction(transactions,owner,account,expense,"10",today);Account second=account(accounts,owner,"0",true);
        mvc.perform(put("/api/transactions/{id}",tx.getId()).header("Authorization","Bearer "+jwt.generateToken(owner)).contentType("application/json")
            .content(mapper.writeValueAsString(Map.of("accountId",second.getId(),"categoryId",income.getId(),"type","INCOME","amount",25.55,"transactionDate","2024-01-31")))).andExpect(status().isOk());
        money(getAnalytics(owner,"summary",query(today,today)),"/totals/expense","0");
        second.setName("New account name");second.setType(AccountType.WALLET);second.setActive(false);accounts.saveAndFlush(second);
        income.setName("New category name");income.setActive(false);categories.saveAndFlush(income);
        var byAccount=getAnalytics(owner,"accounts","?from=2024-01-31&to=2024-01-31");money(byAccount,"/items/0/totals/income","25.55");assertThat(byAccount.at("/items/0/accountName").asText()).isEqualTo("New account name");assertThat(byAccount.at("/items/0/active").asBoolean()).isFalse();
        var byCategory=getAnalytics(owner,"categories","?from=2024-01-31&to=2024-01-31");assertThat(byCategory.at("/items/0/categoryName").asText()).isEqualTo("New category name");assertThat(byCategory.at("/items/0/active").asBoolean()).isFalse();
        mvc.perform(delete("/api/transactions/{id}",tx.getId()).header("Authorization","Bearer "+jwt.generateToken(owner))).andExpect(status().isNoContent());
        assertThat(getAnalytics(owner,"summary","?from=2024-01-31&to=2024-01-31").at("/totals/transactionCount").asLong()).isZero();
    }
    @Test void workerCatchupCountsScheduledActualOnceButNotOperationalBudgetOrLegacyData() throws Exception {
        var template=recurring(recurring,owner,account,expense,LocalDate.of(2024,1,31),RecurringTransactionStatus.ACTIVE);
        budget(budgets,owner,expense,"100",2024,1);
        Expense legacy=new Expense();legacy.setUser(owner);legacy.setAmount(new BigDecimal("999"));legacy.setCategory(ExpenseCategory.FOOD);legacy.setExpenseDate(LocalDate.of(2024,1,31));legacy.setCreatedAt(TIME);legacy.setUpdatedAt(TIME);expenses.saveAndFlush(legacy);
        String q="?from=2024-01-31&to=2024-01-31";
        assertThat(getAnalytics(owner,"summary",q).at("/totals/transactionCount").asLong()).isZero();assertThat(worker.process(template.getId())).isEqualTo(1);
        for(String route:List.of("summary","categories","accounts","trends")) {
            var result=getAnalytics(owner,route,q+(route.equals("trends")?"&grouping=DAILY":""));money(result,"/totals/expense","10");assertThat(result.at("/totals/transactionCount").asLong()).isEqualTo(1);
        }
        LocalDate cursor=recurring.findById(template.getId()).orElseThrow().getNextDueDate();assertThat(cursor).isEqualTo(LocalDate.of(2024,2,29));
        long id=transactions.findAll().getFirst().getId();mvc.perform(delete("/api/transactions/{id}",id).header("Authorization","Bearer "+jwt.generateToken(owner))).andExpect(status().isNoContent());
        money(getAnalytics(owner,"summary",q),"/totals/expense","0");assertThat(occurrences.count()).isEqualTo(1);assertThat(recurring.findById(template.getId()).orElseThrow().getNextDueDate()).isEqualTo(cursor);
        jdbc.update("update recurring_transactions set next_due_date=? where id=?",LocalDate.of(2024,1,31),template.getId());
        assertThat(worker.process(template.getId())).isZero();assertThat(transactions.count()).isZero();
    }
    @Test void aggregateRequestsHaveConstantQueryCountsZeroEntityLoadsAndNoWrites() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(owner,null,owner.getAuthorities()));
        for(int size:List.of(1,30)) {
            for(int i=0;i<size;i++) transaction(transactions,owner,account(accounts,owner,"0",true),category(categories,owner,CategoryType.EXPENSE),"1.23",today);
            var stats=emf.unwrap(SessionFactory.class).getStatistics();
            LocalDate from=LocalDate.of(2020,1,1),to=LocalDate.of(2024,12,31);
            List<Runnable> requests=List.of(()->service.summary(from,to),()->service.categories(from,to),()->service.accounts(from,to),()->service.trends(from,to,AnalyticsGrouping.MONTHLY),()->service.trends(LocalDate.of(2023,1,1),to,AnalyticsGrouping.WEEKLY),()->service.comparison(from,to,from,to));
            for(int i=0;i<requests.size();i++) {
                stats.clear();requests.get(i).run();assertThat(stats.getPrepareStatementCount()).isEqualTo(i==0?1:2);
                assertThat(stats.getEntityLoadCount()).isZero();assertThat(stats.getEntityInsertCount()).isZero();assertThat(stats.getEntityUpdateCount()).isZero();assertThat(stats.getEntityDeleteCount()).isZero();
            }
            stats.clear();assertThatThrownBy(()->service.comparison(from,to,from,to.plusDays(1))).isInstanceOf(com.deepak.cointrailapi.common.exception.InvalidAnalyticsException.class);assertThat(stats.getPrepareStatementCount()).isZero();
        }
    }
}
