package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.common.exception.*;
import com.deepak.cointrailapi.recurringtransaction.dto.*;
import com.deepak.cointrailapi.transaction.TransactionType;
import com.deepak.cointrailapi.user.User;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.Objects;

@Service
public class RecurringTransactionServiceImpl implements RecurringTransactionService {
    private final RecurringTransactionRepository repository;
    private final RecurringTransactionOccurrenceRepository occurrences;
    private final RecurringTransactionResources resources;
    private final RecurrenceCalculator calculator;
    private final Clock clock;

    public RecurringTransactionServiceImpl(RecurringTransactionRepository repository,
            RecurringTransactionOccurrenceRepository occurrences, RecurringTransactionResources resources,
            RecurrenceCalculator calculator, @Qualifier("recurringClock") Clock clock) {
        this.repository = repository;
        this.occurrences = occurrences;
        this.resources = resources;
        this.calculator = calculator;
        this.clock = clock;
    }

    @Override @Transactional
    public RecurringTransactionDetails createRecurringTransaction(CreateRecurringTransactionRequest request) {
        User user = currentUser();
        validateFinancial(request.amount(), request.description());
        LocalDate start = request.startDate();
        LocalDate end = request.endDate();
        if (request.type() == null || request.frequency() == null)
            throw new InvalidRecurringTransactionException("Type and frequency are required");
        if (!validDate(start) || start.isBefore(LocalDate.now(clock)))
            throw new InvalidRecurringTransactionException("Start date must be today or future, within years 1 to 9999");
        if (end != null && (!validDate(end) || end.isBefore(start)))
            throw new InvalidRecurringTransactionException("End date must be on or after start date, within years 1 to 9999");
        var eligible = resources.resolve(user.getId(), request.accountId(), request.categoryId(), request.type());
        RecurringTransaction r = new RecurringTransaction();
        r.setUser(user); r.setAccount(eligible.account()); r.setCategory(eligible.category());
        r.setType(request.type()); r.setAmount(request.amount()); r.setDescription(request.description());
        r.setFrequency(request.frequency()); r.setStartDate(start); r.setEndDate(end); r.setNextDueDate(start);
        r.setStatus(RecurringTransactionStatus.ACTIVE);
        LocalDateTime now = LocalDateTime.now(clock);
        r.setCreatedAt(now); r.setUpdatedAt(now);
        return details(repository.save(r));
    }

    @Override @Transactional(readOnly = true)
    public RecurringTransactionDetails getRecurringTransaction(Long id) {
        Long userId = currentUser().getId();
        validateId(id);
        return details(repository.findByIdAndUserId(id, userId).orElseThrow(RecurringTransactionServiceImpl::notFound));
    }

    @Override @Transactional(readOnly = true)
    public Page<RecurringTransactionDetails> getRecurringTransactions(RecurringTransactionStatus status,
            TransactionType type, Long accountId, Long categoryId, Pageable pageable) {
        return repository.findAll(RecurringTransactionSpecification.ownedAndFiltered(currentUser().getId(), status,
            type, accountId, categoryId), pageable).map(RecurringTransactionServiceImpl::details);
    }

    @Override @Transactional
    public RecurringTransactionDetails updateRecurringTransaction(Long id, UpdateRecurringTransactionRequest request) {
        RecurringTransaction r = ownedForUpdate(id);
        requireNonterminal(r);
        validateFinancial(request.amount(), request.description());
        boolean financialChange = r.getAmount().compareTo(request.amount()) != 0
            || !Objects.equals(r.getDescription(), request.description());
        boolean associationChange = !Objects.equals(r.getAccount().getId(), request.accountId())
            || !Objects.equals(r.getCategory().getId(), request.categoryId());
        boolean due = hasUnprocessedDue(r);
        if (due && (financialChange || (associationChange && r.getStatus() != RecurringTransactionStatus.BLOCKED)))
            throw new RecurringTransactionConflictException("Process due occurrences before editing financial values");
        var eligible = resources.resolve(r.getUser().getId(), request.accountId(), request.categoryId(), r.getType());
        r.setAccount(eligible.account()); r.setCategory(eligible.category());
        r.setAmount(request.amount()); r.setDescription(request.description());
        // Repair never advances cursor or recovers inline; the worker rechecks eligibility.
        r.setUpdatedAt(LocalDateTime.now(clock));
        return details(repository.save(r));
    }

    @Override @Transactional
    public void cancelRecurringTransaction(Long id) {
        RecurringTransaction r = ownedForUpdate(id);
        if (r.getStatus() == RecurringTransactionStatus.CANCELLED) return;
        r.setStatus(RecurringTransactionStatus.CANCELLED); r.setNextDueDate(null); r.setBlockedReason(null);
        r.setUpdatedAt(LocalDateTime.now(clock)); repository.save(r);
    }

    @Override @Transactional
    public RecurringTransactionDetails pauseRecurringTransaction(Long id) {
        RecurringTransaction r = ownedForUpdate(id);
        requireNonterminal(r);
        if (r.getStatus() != RecurringTransactionStatus.PAUSED) {
            r.setStatus(RecurringTransactionStatus.PAUSED); r.setBlockedReason(null);
            r.setUpdatedAt(LocalDateTime.now(clock)); repository.save(r);
        }
        return details(r);
    }

    @Override @Transactional
    public RecurringTransactionDetails resumeRecurringTransaction(Long id) {
        RecurringTransaction r = ownedForUpdate(id);
        requireNonterminal(r);
        if (r.getStatus() == RecurringTransactionStatus.ACTIVE) return details(r);
        if (r.getStatus() == RecurringTransactionStatus.BLOCKED)
            throw new RecurringTransactionConflictException("Blocked templates recover automatically");
        LocalDate next = calculator.onOrAfter(r.getStartDate(), r.getFrequency(), LocalDate.now(clock), r.getEndDate());
        if (next != null) resources.resolve(r.getUser().getId(), r.getAccount().getId(), r.getCategory().getId(), r.getType());
        r.setNextDueDate(next);
        r.setStatus(next == null ? RecurringTransactionStatus.COMPLETED : RecurringTransactionStatus.ACTIVE);
        r.setBlockedReason(null); r.setUpdatedAt(LocalDateTime.now(clock));
        return details(repository.save(r));
    }

    private boolean hasUnprocessedDue(RecurringTransaction r) {
        LocalDate today = LocalDate.now(clock);
        // Paused history is skipped on resume, but an anchored occurrence today is still eligible.
        LocalDate date = r.getStatus() == RecurringTransactionStatus.PAUSED
            ? calculator.onOrAfter(r.getStartDate(), r.getFrequency(), today, r.getEndDate())
            : r.getNextDueDate();
        while (date != null && !date.isAfter(today) && (r.getEndDate() == null || !date.isAfter(r.getEndDate()))) {
            if (!occurrences.existsByRecurringTransactionIdAndScheduledDate(r.getId(), date)) return true;
            date = calculator.next(r.getStartDate(), r.getFrequency(), date, r.getEndDate());
        }
        return false;
    }

    private RecurringTransaction ownedForUpdate(Long id) {
        Long userId = currentUser().getId(); validateId(id);
        return repository.findOwnedForUpdate(id, userId).orElseThrow(RecurringTransactionServiceImpl::notFound);
    }
    private static void validateId(Long id) { if (id == null || id <= 0) throw notFound(); }
    private static RecurringTransactionNotFoundException notFound() {
        return new RecurringTransactionNotFoundException("Recurring transaction not found");
    }
    private static void requireNonterminal(RecurringTransaction r) {
        if (r.getStatus() == RecurringTransactionStatus.CANCELLED || r.getStatus() == RecurringTransactionStatus.COMPLETED)
            throw new RecurringTransactionConflictException("Recurring transaction is terminal");
    }
    static void validateFinancial(BigDecimal amount, String description) {
        if (amount == null || amount.compareTo(new BigDecimal("0.01")) < 0 || amount.scale() > 2
                || (long) amount.precision() - amount.scale() > 17)
            throw new InvalidRecurringTransactionException("Amount must be at least 0.01 with at most 17 integer and 2 fractional digits");
        if (description != null && description.length() > 500)
            throw new InvalidRecurringTransactionException("Description must not exceed 500 characters");
    }
    private static boolean validDate(LocalDate date) { return date != null && date.getYear() >= 1 && date.getYear() <= 9999; }
    private static User currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof User user))
            throw new AccessDeniedException("User is not authenticated");
        return user;
    }
    static RecurringTransactionDetails details(RecurringTransaction r) {
        return new RecurringTransactionDetails(r.getId(), r.getAccount().getId(), r.getAccount().getName(),
            r.getCategory().getId(), r.getCategory().getName(), r.getType(), r.getAmount(), r.getDescription(),
            r.getFrequency(), r.getStartDate(), r.getEndDate(), r.getNextDueDate(), r.getStatus(), r.getBlockedReason(),
            r.getCreatedAt(), r.getUpdatedAt());
    }
}
