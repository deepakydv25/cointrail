package com.deepak.cointrailapi.dashboard;

import com.deepak.cointrailapi.transaction.TransactionType;
import com.deepak.cointrailapi.recurringtransaction.RecurrenceFrequency;
import com.deepak.cointrailapi.recurringtransaction.RecurringTransactionStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Read-time values only; no dashboard persistence model. */
public record DashboardDetails(Integer year, Integer month, BigDecimal totalActiveAccountBalance,
        MonthlySummary monthlySummary, BudgetSummary budgetSummary,
        List<RecentTransaction> recentTransactions, PendingRecurringTransactions pendingRecurringTransactions) {
    public record MonthlySummary(BigDecimal income, BigDecimal expense, BigDecimal netCashFlow) {}
    public record BudgetSummary(int budgetCount, BigDecimal totalBudgetAmount,
            BigDecimal spentOnBudgetedCategories, BigDecimal remainingBudgetAmount, long overBudgetCount) {}
    public record RecentTransaction(Long id, TransactionType type, BigDecimal amount, String description,
            LocalDate transactionDate, Long accountId, String accountName, Long categoryId, String categoryName) {}
    public record PendingRecurringTransactions(LocalDate asOfDate, LocalDate throughDate, String timezone,
            List<PendingRecurringTransaction> items) {}
    public record PendingRecurringTransaction(Long id, TransactionType type, BigDecimal amount, String description,
            RecurrenceFrequency frequency, LocalDate nextDueDate, Long accountId, String accountName,
            Long categoryId, String categoryName, RecurringTransactionStatus status, String blockedReason, boolean overdue) {}
}
