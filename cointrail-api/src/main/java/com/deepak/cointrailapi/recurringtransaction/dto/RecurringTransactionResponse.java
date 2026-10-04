package com.deepak.cointrailapi.recurringtransaction.dto;

import com.deepak.cointrailapi.recurringtransaction.*;
import com.deepak.cointrailapi.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record RecurringTransactionResponse(
    Long id, Long accountId, String accountName, Long categoryId, String categoryName,
    TransactionType type, BigDecimal amount, String description, RecurrenceFrequency frequency,
    LocalDate startDate, LocalDate endDate, LocalDate nextDueDate, RecurringTransactionStatus status,
    String blockedReason, LocalDateTime createdAt, LocalDateTime updatedAt
) {
    public static RecurringTransactionResponse from(RecurringTransactionDetails r) {
        return new RecurringTransactionResponse(r.id(), r.accountId(), r.accountName(), r.categoryId(), r.categoryName(),
            r.type(), r.amount(), r.description(), r.frequency(), r.startDate(), r.endDate(), r.nextDueDate(),
            r.status(), r.blockedReason(), r.createdAt(), r.updatedAt());
    }
}
