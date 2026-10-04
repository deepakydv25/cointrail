package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Internal service result, separate from the HTTP DTO. */
public record RecurringTransactionDetails(
    Long id, Long accountId, String accountName, Long categoryId, String categoryName,
    TransactionType type, BigDecimal amount, String description, RecurrenceFrequency frequency,
    LocalDate startDate, LocalDate endDate, LocalDate nextDueDate, RecurringTransactionStatus status,
    String blockedReason, LocalDateTime createdAt, LocalDateTime updatedAt
) {}
