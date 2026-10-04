package com.deepak.cointrailapi.recurringtransaction;

import org.hibernate.exception.ConstraintViolationException;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.*;

@Component
public class RecurringTransactionScheduler {
    private static final Logger log = LoggerFactory.getLogger(RecurringTransactionScheduler.class);
    private final RecurringTransactionRepository repository;
    private final RecurringTransactionGenerationWorker worker;
    private final RecurringTransactionSchedulingConfig.Settings settings;
    private final Clock clock;
    // Local continuation is only a fairness hint; DB lock/unique key provide all correctness.
    private LocalDate afterDate = LocalDate.of(1, 1, 1);
    private long afterId = 0;

    public RecurringTransactionScheduler(RecurringTransactionRepository repository, RecurringTransactionGenerationWorker worker,
            RecurringTransactionSchedulingConfig.Settings settings, @Qualifier("recurringClock") Clock clock) {
        this.repository = repository; this.worker = worker; this.settings = settings; this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${app.recurring.poll-interval}")
    public void runCycle() {
        if (!settings.enabled()) return;
        var page = PageRequest.of(0, settings.templateBatchSize());
        var candidates = repository.findCandidates(LocalDate.now(clock), afterDate, afterId, page);
        if (candidates.isEmpty()) {
            afterDate = LocalDate.of(1, 1, 1); afterId = 0;
            candidates = repository.findCandidates(LocalDate.now(clock), afterDate, afterId, page);
        }
        for (var candidate : candidates) {
            afterDate = candidate.getNextDueDate(); afterId = candidate.getId();
            try { worker.process(candidate.getId()); }
            catch (RuntimeException exception) {
                // The worker transaction has already rolled back. Retry in a later cycle.
                if (isOccurrenceDuplicate(exception)) {
                    log.debug("Recurring occurrence already processed for template {}; recheck next cycle", candidate.getId());
                } else {
                    log.error("Recurring generation failed for template {} ({})", candidate.getId(), exception.getClass().getSimpleName());
                }
            }
        }
    }

    private boolean isOccurrenceDuplicate(RuntimeException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation
                    && "uq_recurring_occurrence".equals(violation.getConstraintName())
                    && "23505".equals(violation.getSQLState())) return true;
        }
        return false;
    }
}
