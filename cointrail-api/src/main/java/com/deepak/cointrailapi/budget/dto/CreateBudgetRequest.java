package com.deepak.cointrailapi.budget.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CreateBudgetRequest(
        @NotNull(message = "Category ID is required")
        @Positive(message = "Category ID must be positive")
        Long categoryId,

        @NotNull(message = "Year is required")
        @Min(value = 1, message = "Year must be between 1 and 9999")
        @Max(value = 9999, message = "Year must be between 1 and 9999")
        Integer year,

        @NotNull(message = "Month is required")
        @Min(value = 1, message = "Month must be between 1 and 12")
        @Max(value = 12, message = "Month must be between 1 and 12")
        Integer month,

        @NotNull(message = "Budget amount is required")
        @DecimalMin(value = "0.01", message = "Budget amount must be at least 0.01")
        @Digits(integer = 17, fraction = 2,
                message = "Budget amount must have at most 17 integer and 2 fractional digits")
        BigDecimal amount
) {
}
