package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.account.AccountType;
import com.deepak.cointrailapi.category.CategoryType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Immutable read-time values, with no Analytics persistence model. */
public final class AnalyticsDetails {
    private AnalyticsDetails() {}
    public record Totals(BigDecimal income, BigDecimal expense, BigDecimal netCashFlow, long transactionCount) {
        public static Totals of(BigDecimal income, BigDecimal expense, long count) {
            BigDecimal zero = new BigDecimal("0.00");
            income = income == null ? zero : income;
            expense = expense == null ? zero : expense;
            return new Totals(income, expense, income.subtract(expense), count);
        }
        public static Totals zero() { return of(null, null, 0); }
        public Totals minus(Totals baseline) {
            return new Totals(income.subtract(baseline.income), expense.subtract(baseline.expense),
                    netCashFlow.subtract(baseline.netCashFlow), transactionCount - baseline.transactionCount);
        }
    }
    public record CategoryGroup(Long categoryId, String categoryName, CategoryType categoryType,
            boolean system, boolean active, Totals totals) {}
    public record AccountGroup(Long accountId, String accountName, AccountType accountType, boolean active, Totals totals) {}
    public record Bucket(LocalDate from, LocalDate to, Totals totals) {}
    public record Summary(AnalyticsRange range, Totals totals) {}
    public record Categories(AnalyticsRange range, Totals totals, List<CategoryGroup> items) {}
    public record Accounts(AnalyticsRange range, Totals totals, List<AccountGroup> items) {}
    public record Trends(AnalyticsRange range, AnalyticsGrouping grouping, Totals totals, List<Bucket> items) {}
    public record Comparison(Summary current, Summary baseline, Totals delta) {}
}
