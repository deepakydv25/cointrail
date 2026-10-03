package com.deepak.cointrailapi.budget;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Internal service result; the HTTP response contract is defined separately. */
public record BudgetDetails(
        Long id,
        Long categoryId,
        String categoryName,
        Integer year,
        Integer month,
        BigDecimal amount,
        BigDecimal spentAmount,
        BigDecimal remainingAmount,
        boolean overBudget,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
