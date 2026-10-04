package com.deepak.cointrailapi.dashboard;

import com.deepak.cointrailapi.account.AccountRepository;
import com.deepak.cointrailapi.budget.BudgetDetails;
import com.deepak.cointrailapi.budget.BudgetService;
import com.deepak.cointrailapi.common.exception.InvalidDashboardException;
import com.deepak.cointrailapi.dashboard.DashboardDetails.*;
import com.deepak.cointrailapi.recurringtransaction.RecurringTransactionRepository;
import com.deepak.cointrailapi.transaction.TransactionRepository;
import com.deepak.cointrailapi.transaction.TransactionType;
import com.deepak.cointrailapi.transaction.TransactionTypeTotal;
import com.deepak.cointrailapi.user.User;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

@Service
public class DashboardServiceImpl implements DashboardService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final LocalDate LAST_RECURRING_DATE = LocalDate.of(9999, 12, 31);
    private static final PageRequest PREVIEW = PageRequest.of(0, 5);
    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final BudgetService budgets;
    private final RecurringTransactionRepository recurring;
    private final Clock recurringClock;

    public DashboardServiceImpl(AccountRepository accounts, TransactionRepository transactions,
            BudgetService budgets, RecurringTransactionRepository recurring,
            @Qualifier("recurringClock") Clock recurringClock) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.budgets = budgets;
        this.recurring = recurring;
        this.recurringClock = recurringClock;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDetails getDashboard(Integer year, Integer month) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof User user))
            throw new AccessDeniedException("User is not authenticated");
        if (year == null || year < 1 || year > 9999)
            throw new InvalidDashboardException("Year must be between 1 and 9999");
        if (month == null || month < 1 || month > 12)
            throw new InvalidDashboardException("Month must be between 1 and 12");
        Long userId = user.getId();
        YearMonth period = YearMonth.of(year, month);
        BigDecimal balance = zeroIfNull(accounts.sumActiveOpeningBalances(userId))
                .add(zeroIfNull(transactions.sumActiveAccountNetFlow(userId)));
        BigDecimal income = ZERO;
        BigDecimal expense = ZERO;
        for (TransactionTypeTotal total : transactions.sumByTypeForPeriod(
                userId, period.atDay(1), period.plusMonths(1).atDay(1))) {
            if (total.getType() == TransactionType.INCOME) income = zeroIfNull(total.getTotalAmount());
            else if (total.getType() == TransactionType.EXPENSE) expense = zeroIfNull(total.getTotalAmount());
        }
        List<BudgetDetails> monthBudgets = budgets.getBudgets(year, month);
        BigDecimal planned = ZERO;
        BigDecimal spent = ZERO;
        long overBudgetCount = 0;
        for (BudgetDetails budget : monthBudgets) {
            planned = planned.add(budget.amount());
            spent = spent.add(budget.spentAmount());
            if (budget.overBudget()) overBudgetCount++;
        }
        var recent = transactions.findByUserIdOrderByTransactionDateDescCreatedAtDescIdDesc(userId, PREVIEW)
                .stream().map(t -> new RecentTransaction(t.getId(), t.getType(), t.getAmount(), t.getDescription(),
                        t.getTransactionDate(), t.getAccount().getId(), t.getAccount().getName(),
                        t.getCategory().getId(), t.getCategory().getName())).toList();
        // Only recurring preview uses this clock; actual financial dates retain their existing semantics.
        LocalDate today = LocalDate.now(recurringClock);
        LocalDate through = today.isAfter(LAST_RECURRING_DATE.minusDays(30))
                ? LAST_RECURRING_DATE : today.plusDays(30);
        var pending = recurring.findPendingForDashboard(userId, through, PREVIEW).stream()
                .map(r -> new PendingRecurringTransaction(r.getId(), r.getType(), r.getAmount(), r.getDescription(),
                        r.getFrequency(), r.getNextDueDate(), r.getAccount().getId(), r.getAccount().getName(),
                        r.getCategory().getId(), r.getCategory().getName(), r.getStatus(), r.getBlockedReason(),
                        r.getNextDueDate().isBefore(today))).toList();
        return new DashboardDetails(year, month, balance, new MonthlySummary(income, expense, income.subtract(expense)),
                new BudgetSummary(monthBudgets.size(), planned, spent, planned.subtract(spent), overBudgetCount),
                recent, new PendingRecurringTransactions(today, through, recurringClock.getZone().getId(), pending));
    }

    private static BigDecimal zeroIfNull(BigDecimal value) { return value == null ? ZERO : value; }
}
