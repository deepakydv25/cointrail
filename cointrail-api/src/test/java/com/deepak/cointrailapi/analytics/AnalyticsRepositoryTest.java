package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.account.*;
import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.transaction.*;
import com.deepak.cointrailapi.user.*;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import java.time.LocalDate;
import java.util.List;
import static com.deepak.cointrailapi.analytics.AnalyticsFixtures.*;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties={"spring.jpa.properties.hibernate.generate_statistics=true",
        "spring.jpa.properties.hibernate.session_factory.statement_inspector=com.deepak.cointrailapi.analytics.AnalyticsRepositoryTest$SqlCapture"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers @ActiveProfiles("test")
class AnalyticsRepositoryTest {
    public static class SqlCapture implements org.hibernate.resource.jdbc.spi.StatementInspector {
        static String last;
        @Override public String inspect(String sql) { last=sql;return sql; }
    }
    @Container @ServiceConnection static PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17-alpine");
    @Autowired UserRepository users; @Autowired AccountRepository accounts; @Autowired CategoryRepository categories;
    @Autowired TransactionRepository transactions; @Autowired EntityManager em; @Autowired JdbcTemplate jdbc;
    final LocalDate from=LocalDate.of(2024,2,1), exclusive=LocalDate.of(2024,3,1);

    @Test void totalsCountBothTypesAndKeepInactiveHistoryWithinHalfOpenOwnerRange() {
        User u=user(users),other=user(users); Account a=account(accounts,u,"999",false);
        Category c=category(categories,u,CategoryType.EXPENSE),income=category(categories,u,CategoryType.INCOME);
        c.setActive(false);categories.saveAndFlush(c);
        transaction(transactions,u,a,c,"1.23",from);transaction(transactions,u,a,c,"2.34",exclusive.minusDays(1));
        transaction(transactions,u,a,income,"3.45",from.plusDays(1));
        transaction(transactions,u,a,c,"99",from.minusDays(1));transaction(transactions,u,a,c,"99",exclusive);
        transaction(transactions,other,account(accounts,other,"0",true),c,"999",from);
        var totals=transactions.analyticsTotals(u.getId(),from,exclusive);
        assertThat(totals.getIncome()).isEqualByComparingTo("3.45");assertThat(totals.getExpense()).isEqualByComparingTo("3.57");assertThat(totals.getTransactionCount()).isEqualTo(3);
        var empty=transactions.analyticsTotals(-1L,from,exclusive);
        assertThat(empty.getIncome()).isNull();assertThat(empty.getExpense()).isNull();assertThat(empty.getTransactionCount()).isZero();
        assertThat(transactions.analyticsCategories(-1L,from,exclusive)).isEmpty();assertThat(transactions.analyticsAccounts(-1L,from,exclusive)).isEmpty();
        assertThat(transactions.analyticsBuckets(-1L,from,exclusive,"day")).isEmpty();
    }
    @Test void stableGroupsUseCurrentMetadataAndDoNotMultiplyOrLoadEntities() {
        User u=user(users),other=user(users);Account a=account(accounts,u,"0",true),second=account(accounts,u,"0",true);
        account(accounts,u,"0",true);Category c=category(categories,u,CategoryType.EXPENSE),sameName=category(categories,u,CategoryType.EXPENSE);
        Category system=categories.findAll().stream().filter(x->x.isSystem()&&x.getType()==CategoryType.EXPENSE).findFirst().orElseThrow();
        c.setName(system.getName());categories.saveAndFlush(c); // Same label, different stable ID.
        transaction(transactions,u,a,c,"1.11",from);transaction(transactions,u,second,c,"2.22",from);
        transaction(transactions,u,a,system,"3.33",from);transaction(transactions,other,account(accounts,other,"0",true),system,"999",from);
        c.setActive(false);categories.saveAndFlush(c);a.setName("Renamed");a.setType(AccountType.WALLET);a.setActive(false);accounts.saveAndFlush(a);
        em.clear();var stats=em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();stats.clear();
        var groups=transactions.analyticsCategories(u.getId(),from,exclusive);
        assertThat(groups).extracting(AnalyticsCategoryProjection::getCategoryId).containsExactly(system.getId(),c.getId());
        assertThat(groups.getFirst().getSystem()).isTrue();assertThat(groups.getFirst().getExpense()).isEqualByComparingTo("3.33");
        assertThat(groups.getLast().getActive()).isFalse();assertThat(groups.getLast().getExpense()).isEqualByComparingTo("3.33");assertThat(groups.getLast().getTransactionCount()).isEqualTo(2);
        var accountGroups=transactions.analyticsAccounts(u.getId(),from,exclusive);
        assertThat(accountGroups).extracting(AnalyticsAccountProjection::getAccountId).containsExactly(a.getId(),second.getId());
        assertThat(accountGroups.getFirst().getAccountName()).isEqualTo("Renamed");assertThat(accountGroups.getFirst().getAccountType()).isEqualTo(AccountType.WALLET);assertThat(accountGroups.getFirst().getActive()).isFalse();
        assertThat(accountGroups.getFirst().getExpense()).isEqualByComparingTo("4.44");
        assertThat(stats.getEntityLoadCount()).isZero();assertThat(stats.getPrepareStatementCount()).isEqualTo(2);
    }
    @Test void nativeDateKeysUseMondayWeeksCalendarMonthsAndStoredDatesWithoutTimezoneConversion() {
        User u=user(users);Account a=account(accounts,u,"0",true);Category c=category(categories,u,CategoryType.EXPENSE);
        for(LocalDate date:List.of(LocalDate.of(2023,12,31),LocalDate.of(2024,1,1),LocalDate.of(2024,1,7),LocalDate.of(2024,1,8),LocalDate.of(2024,2,29))) transaction(transactions,u,a,c,"1.23",date);
        LocalDate start=LocalDate.of(2023,12,31),end=LocalDate.of(2024,3,1);
        jdbc.execute("set local timezone='Pacific/Kiritimati'");
        var weekly=transactions.analyticsBuckets(u.getId(),start,end,"week");
        assertThat(weekly).extracting(AnalyticsBucketProjection::getBucketStart).containsExactly(LocalDate.of(2023,12,25),LocalDate.of(2024,1,1),LocalDate.of(2024,1,8),LocalDate.of(2024,2,26));
        assertThat(weekly.get(1).getTransactionCount()).isEqualTo(2);assertThat(weekly.get(1).getExpense()).isEqualByComparingTo("2.46");
        assertThat(transactions.analyticsBuckets(u.getId(),start,end,"month")).extracting(AnalyticsBucketProjection::getBucketStart).containsExactly(LocalDate.of(2023,12,1),LocalDate.of(2024,1,1),LocalDate.of(2024,2,1));
        assertThat(transactions.analyticsBuckets(u.getId(),start,end,"day")).hasSize(5);
    }
    @Test void postgresSupportsPublicExtremesAndUnboundedNumericAggregatePrecision() {
        User u=user(users);Account a=account(accounts,u,"0",true);Category c=category(categories,u,CategoryType.INCOME);
        transaction(transactions,u,a,c,"99999999999999999.99",LocalDate.of(9999,12,31));transaction(transactions,u,a,c,"99999999999999999.99",LocalDate.of(9999,12,31));
        transaction(transactions,u,a,c,"1.23",LocalDate.of(1,1,1));
        for(LocalDate start:List.of(LocalDate.of(1,1,1),LocalDate.of(9999,12,31))) {
            var total=transactions.analyticsTotals(u.getId(),start,start.plusDays(1));
            String expected=start.getYear()==1?"1.23":"199999999999999999.98";
            assertThat(total.getIncome()).isEqualByComparingTo(expected);
            for(String unit:List.of("day","week","month")) {
                var buckets=transactions.analyticsBuckets(u.getId(),start,start.plusDays(1),unit);
                assertThat(buckets).hasSize(1);assertThat(buckets.getFirst().getIncome()).isEqualByComparingTo(expected);assertThat(buckets.getFirst().getBucketStart()).isNotNull();
            }
            assertThat(transactions.analyticsAccounts(u.getId(),start,start.plusDays(1)).getFirst().getIncome()).isEqualByComparingTo(expected);
            assertThat(transactions.analyticsCategories(u.getId(),start,start.plusDays(1)).getFirst().getIncome()).isEqualByComparingTo(expected);
        }
    }

    @Test void inspectActualGeneratedSqlPlansWithRepresentativeMultiOwnerHistory() {
        User owner=user(users);
        for(User u:List.of(owner,user(users),user(users))) {
            var accountIds=new java.util.ArrayList<Long>();var categoryIds=new java.util.ArrayList<Long>();
            for(int i=0;i<12;i++) {accountIds.add(account(accounts,u,"0",true).getId());categoryIds.add(category(categories,u,CategoryType.EXPENSE).getId());}
            String accountArray="array["+String.join(",",accountIds.stream().map(Object::toString).toList())+"]";
            String categoryArray="array["+String.join(",",categoryIds.stream().map(Object::toString).toList())+"]";
            // 60k actuals per owner, ten-year dense and sparse history, 12 account/category groups.
            jdbc.update("""
                insert into transactions(user_id,account_id,category_id,type,amount,transaction_date,created_at,updated_at)
                select ?, (%s)[1+n%%12], (%s)[1+(n/12)%%12], 'EXPENSE', 1.23,
                       date '2015-01-01'+case when n<=50000 then n%%3653 else (n%%100)*35 end,
                       timestamp '2024-01-01',timestamp '2024-01-01'
                from generate_series(1,60000) n
                """.formatted(accountArray,categoryArray),u.getId());
        }
        jdbc.execute("analyze transactions");jdbc.execute("analyze accounts");jdbc.execute("analyze categories");
        em.clear();em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics().clear();
        LocalDate start=LocalDate.of(2020,1,1),end=LocalDate.of(2025,1,1);
        transactions.analyticsTotals(owner.getId(),start,end);explain("summary/comparison five years",owner.getId(),start,end);
        transactions.analyticsCategories(owner.getId(),start,end);explain("categories five years",owner.getId(),start,end);
        transactions.analyticsAccounts(owner.getId(),start,end);explain("accounts five years",owner.getId(),start,end);
        transactions.analyticsBuckets(owner.getId(),start,end,"month");explain("MONTHLY five years","month",owner.getId(),start,end);
        transactions.analyticsBuckets(owner.getId(),LocalDate.of(2023,1,1),end,"week");explain("WEEKLY two years","week",owner.getId(),LocalDate.of(2023,1,1),end);
        transactions.analyticsBuckets(owner.getId(),LocalDate.of(2024,1,1),end,"day");explain("DAILY 366 days","day",owner.getId(),LocalDate.of(2024,1,1),end);
        transactions.analyticsTotals(owner.getId(),LocalDate.of(2024,12,1),end);explain("selective one month",owner.getId(),LocalDate.of(2024,12,1),end);
    }
    void explain(String label,Object... parameters) {
        // EXPLAIN the exact Hibernate/native SELECT just executed, with identical parameter order.
        String sql=SqlCapture.last;
        assertThat(sql).startsWith("select");
        var stats=em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        assertThat(stats.getPrepareStatementCount()).isEqualTo(1);assertThat(stats.getEntityLoadCount()).isZero();
        stats.clear();
        var plan=jdbc.queryForList("explain (analyze,buffers) "+sql,String.class,parameters);
        assertThat(plan).isNotEmpty();System.out.println("Analytics query plan: "+label+"\n"+sql+"\n"+String.join("\n",plan));
    }
}
