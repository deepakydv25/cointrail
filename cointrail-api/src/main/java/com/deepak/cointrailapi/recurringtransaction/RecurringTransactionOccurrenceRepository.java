package com.deepak.cointrailapi.recurringtransaction;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;

public interface RecurringTransactionOccurrenceRepository extends JpaRepository<RecurringTransactionOccurrence, Long> {
    boolean existsByRecurringTransactionIdAndScheduledDate(Long recurringTransactionId, LocalDate scheduledDate);
}
