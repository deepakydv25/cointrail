package com.deepak.cointrailapi.recurringtransaction.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record UpdateRecurringTransactionRequest(
    @NotNull @Positive Long accountId,
    @NotNull @Positive Long categoryId,
    @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
    @Size(max = 500) String description
) {}
