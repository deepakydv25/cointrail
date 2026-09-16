package com.deepak.cointrailapi.dto;

import com.deepak.cointrailapi.enums.ExpenseCategory;

import java.math.BigDecimal;
import java.util.Map;

public record ExpenseSummaryResponse (
        BigDecimal totalAmount,
        long totalExpenses,
        Map<ExpenseCategory, BigDecimal> categoryBreakdown
) {

}
