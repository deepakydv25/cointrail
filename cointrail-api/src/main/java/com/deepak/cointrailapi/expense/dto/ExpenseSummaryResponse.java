package com.deepak.cointrailapi.expense.dto;

import com.deepak.cointrailapi.expense.ExpenseCategory;

import java.math.BigDecimal;
import java.util.Map;

public record ExpenseSummaryResponse (
        BigDecimal totalAmount,
        long totalExpenses,
        Map<ExpenseCategory, BigDecimal> categoryBreakdown
) {

}
