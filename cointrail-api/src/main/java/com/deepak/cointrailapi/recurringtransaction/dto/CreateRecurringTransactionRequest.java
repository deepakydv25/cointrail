package com.deepak.cointrailapi.recurringtransaction.dto;

import com.deepak.cointrailapi.recurringtransaction.RecurrenceFrequency;
import com.deepak.cointrailapi.transaction.TransactionType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateRecurringTransactionRequest(
    @NotNull @Positive Long accountId,
    @NotNull @Positive Long categoryId,
    @NotNull TransactionType type,
    @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
    @Size(max = 500) String description,
    @NotNull RecurrenceFrequency frequency,
    @NotNull LocalDate startDate,
    LocalDate endDate
) {}
