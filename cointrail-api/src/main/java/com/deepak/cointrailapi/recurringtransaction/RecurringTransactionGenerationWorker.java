package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.common.exception.*;
import com.deepak.cointrailapi.transaction.Transaction;
import com.deepak.cointrailapi.transaction.TransactionRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;

@Service
public class RecurringTransactionGenerationWorker {
    private final RecurringTransactionRepository templates;
    private final RecurringTransactionOccurrenceRepository occurrences;
    private final TransactionRepository transactions;
    private final RecurringTransactionResources resources;
    private final RecurrenceCalculator calculator;
    private final Clock clock;
    private final RecurringTransactionSchedulingConfig.Settings settings;

    public RecurringTransactionGenerationWorker(RecurringTransactionRepository templates,
            RecurringTransactionOccurrenceRepository occurrences, TransactionRepository transactions,
            RecurringTransactionResources resources, RecurrenceCalculator calculator,
            @Qualifier("recurringClock") Clock clock, RecurringTransactionSchedulingConfig.Settings settings) {
        this.templates = templates; this.occurrences = occurrences; this.transactions = transactions;
        this.resources = resources; this.calculator = calculator; this.clock = clock; this.settings = settings;
    }

    /** One bounded template batch: financial rows, occurrence identities and cursor commit together. */
    @Transactional
    public int process(Long id) {
        RecurringTransaction r = templates.findForGeneration(id).orElse(null);
        if (r == null || (r.getStatus() != RecurringTransactionStatus.ACTIVE && r.getStatus() != RecurringTransactionStatus.BLOCKED))
            return 0;
        LocalDate today = LocalDate.now(clock);
        int posted = 0;
        for (int scanned = 0; scanned < settings.occurrenceBatchSize(); scanned++) {
            LocalDate due = r.getNextDueDate();
            if (due == null || (r.getEndDate() != null && due.isAfter(r.getEndDate()))) {
                complete(r); break;
            }
            if (due.isAfter(today)) break;
            // Processed markers survive normal Transaction hard deletion.
            if (!occurrences.existsByRecurringTransactionIdAndScheduledDate(r.getId(), due)) {
                RecurringTransactionResources.Eligible eligible;
                try {
                    eligible = resources.resolve(r.getUser().getId(), r.getAccount().getId(), r.getCategory().getId(), r.getType());
                } catch (AccountNotFoundException | CategoryNotFoundException | InvalidRecurringTransactionException e) {
                    r.setStatus(RecurringTransactionStatus.BLOCKED); r.setBlockedReason(e.getMessage());
                    r.setUpdatedAt(LocalDateTime.now(clock));
                    return posted;
                }
                r.setStatus(RecurringTransactionStatus.ACTIVE); r.setBlockedReason(null);
                RecurringTransactionServiceImpl.validateFinancial(r.getAmount(), r.getDescription());
                Transaction t = new Transaction();
                t.setUser(r.getUser()); t.setAccount(eligible.account()); t.setCategory(eligible.category());
                t.setType(r.getType()); t.setAmount(r.getAmount()); t.setDescription(r.getDescription());
                t.setTransactionDate(due);
                // Preserve ordinary Transaction timestamp semantics; only recurring timestamps use its Clock.
                LocalDateTime transactionNow = LocalDateTime.now();
                t.setCreatedAt(transactionNow); t.setUpdatedAt(transactionNow);
                transactions.saveAndFlush(t);
                RecurringTransactionOccurrence occurrence = new RecurringTransactionOccurrence();
                occurrence.setRecurringTransaction(r); occurrence.setScheduledDate(due); occurrence.setTransaction(t);
                occurrence.setPostedAt(LocalDateTime.now(clock));
                occurrences.saveAndFlush(occurrence);
                posted++;
            }
            r.setNextDueDate(calculator.next(r.getStartDate(), r.getFrequency(), due, r.getEndDate()));
            r.setUpdatedAt(LocalDateTime.now(clock));
            if (r.getNextDueDate() == null) { complete(r); break; }
        }
        return posted;
    }

    private void complete(RecurringTransaction r) {
        r.setStatus(RecurringTransactionStatus.COMPLETED); r.setNextDueDate(null); r.setBlockedReason(null);
        r.setUpdatedAt(LocalDateTime.now(clock));
    }
}
