package com.deepak.cointrailapi.dashboard.dto;

import com.deepak.cointrailapi.dashboard.DashboardDetails;
import com.deepak.cointrailapi.dashboard.DashboardDetails.*;
import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(Integer year, Integer month, BigDecimal totalActiveAccountBalance,
        MonthlySummary monthlySummary, BudgetSummary budgetSummary,
        List<RecentTransaction> recentTransactions, PendingRecurringTransactions pendingRecurringTransactions) {
    public static DashboardResponse from(DashboardDetails details) {
        return new DashboardResponse(details.year(), details.month(), details.totalActiveAccountBalance(),
                details.monthlySummary(), details.budgetSummary(), details.recentTransactions(),
                details.pendingRecurringTransactions());
    }
}
