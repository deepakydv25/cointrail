package com.deepak.cointrailapi.budget.dto;

import com.deepak.cointrailapi.budget.BudgetDetails;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BudgetResponse(
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

    public static BudgetResponse from(BudgetDetails budget) {
        return new BudgetResponse(
                budget.id(),
                budget.categoryId(),
                budget.categoryName(),
                budget.year(),
                budget.month(),
                budget.amount(),
                budget.spentAmount(),
                budget.remainingAmount(),
                budget.overBudget(),
                budget.createdAt(),
                budget.updatedAt()
        );
    }
}
