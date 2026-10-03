package com.deepak.cointrailapi.budget.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateBudgetRequest(
        @NotNull(message = "Budget amount is required")
        @DecimalMin(value = "0.01", message = "Budget amount must be at least 0.01")
        @Digits(integer = 17, fraction = 2,
                message = "Budget amount must have at most 17 integer and 2 fractional digits")
        BigDecimal amount
) {
}
