package com.deepak.cointrailapi.budget;

import com.deepak.cointrailapi.category.Category;
import com.deepak.cointrailapi.category.CategoryRepository;
import com.deepak.cointrailapi.category.CategoryType;
import com.deepak.cointrailapi.common.exception.BudgetAlreadyExistsException;
import com.deepak.cointrailapi.common.exception.BudgetNotFoundException;
import com.deepak.cointrailapi.common.exception.CategoryNotFoundException;
import com.deepak.cointrailapi.common.exception.InvalidBudgetException;
import com.deepak.cointrailapi.transaction.CategoryExpenseTotal;
import com.deepak.cointrailapi.transaction.TransactionRepository;
import com.deepak.cointrailapi.user.User;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BudgetServiceImpl implements BudgetService {

    private static final BigDecimal MIN_AMOUNT = new BigDecimal("0.01");
    private static final BigDecimal ZERO_AMOUNT = new BigDecimal("0.00");
    private static final String DUPLICATE_MESSAGE = "Budget for this category and month already exists";
    private static final String UNIQUE_CONSTRAINT = "uq_budgets_user_category_period";

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;

    public BudgetServiceImpl(BudgetRepository budgetRepository,
                             CategoryRepository categoryRepository,
                             TransactionRepository transactionRepository) {
        this.budgetRepository = budgetRepository;
        this.categoryRepository = categoryRepository;
        this.transactionRepository = transactionRepository;
    }

    @Override
    @Transactional
    public BudgetDetails createBudget(Long categoryId, Integer year, Integer month, BigDecimal amount) {
        User user = getCurrentUser();
        validatePeriod(year, month);
        validateAmount(amount);

        Category category = findEligibleCategory(categoryId, user.getId());

        if (budgetRepository.existsByUserIdAndCategoryIdAndYearAndMonth(
                user.getId(), category.getId(), year, month)) {
            throw new BudgetAlreadyExistsException(DUPLICATE_MESSAGE);
        }

        Budget budget = new Budget();
        budget.setUser(user);
        budget.setCategory(category);
        budget.setYear(year);
        budget.setMonth(month);
        budget.setAmount(amount);

        LocalDateTime now = LocalDateTime.now();
        budget.setCreatedAt(now);
        budget.setUpdatedAt(now);

        Budget saved;
        try {
            saved = budgetRepository.saveAndFlush(budget);
        } catch (DataIntegrityViolationException exception) {
            if (isBudgetDuplicate(exception)) {
                throw new BudgetAlreadyExistsException(DUPLICATE_MESSAGE, exception);
            }
            throw exception;
        }

        return toDetails(saved, spendingForBudget(saved, user.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BudgetDetails> getBudgets(Integer year, Integer month) {
        User user = getCurrentUser();
        YearMonth period = validatePeriod(year, month);

        List<Budget> budgets = budgetRepository.findByUserIdAndYearAndMonthOrderByCategoryIdAscIdAsc(
                user.getId(), year, month);

        if (budgets.isEmpty()) {
            return List.of();
        }

        List<Long> categoryIds = budgets.stream().map(budget -> budget.getCategory().getId()).toList();
        Map<Long, BigDecimal> spending = spendingByCategory(user.getId(), categoryIds, period);

        return budgets.stream()
                .map(budget -> toDetails(budget,
                        spending.getOrDefault(budget.getCategory().getId(), ZERO_AMOUNT)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BudgetDetails getBudget(Long id) {
        User user = getCurrentUser();
        Budget budget = findOwnedBudget(id, user.getId());
        return toDetails(budget, spendingForBudget(budget, user.getId()));
    }

    @Override
    @Transactional
    public BudgetDetails updateBudget(Long id, BigDecimal amount) {
        User user = getCurrentUser();
        Budget budget = findOwnedBudget(id, user.getId());
        validateAmount(amount);

        budget.setAmount(amount);
        budget.setUpdatedAt(LocalDateTime.now());

        Budget saved = budgetRepository.save(budget);
        return toDetails(saved, spendingForBudget(saved, user.getId()));
    }

    @Override
    @Transactional
    public void deleteBudget(Long id) {
        User user = getCurrentUser();
        Budget budget = findOwnedBudget(id, user.getId());
        budgetRepository.delete(budget);
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof User user)) {
            throw new AccessDeniedException("User is not authenticated");
        }
        return user;
    }

    private Budget findOwnedBudget(Long id, Long userId) {
        if (id == null || id <= 0) {
            throw new BudgetNotFoundException("Budget not found");
        }
        return budgetRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new BudgetNotFoundException("Budget not found"));
    }

    private Category findEligibleCategory(Long categoryId, Long userId) {
        if (categoryId == null || categoryId <= 0) {
            throw new InvalidBudgetException("Category ID must be positive");
        }

        Category category = categoryRepository.findByIdAndActiveTrue(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException("Category not found"));

        if (!category.isSystem()
                && (category.getUser() == null || !category.getUser().getId().equals(userId))) {
            throw new CategoryNotFoundException("Category not found");
        }
        if (category.getType() != CategoryType.EXPENSE) {
            throw new InvalidBudgetException("Budgets require an expense category");
        }
        return category;
    }

    private YearMonth validatePeriod(Integer year, Integer month) {
        if (year == null || year < 1 || year > 9999) {
            throw new InvalidBudgetException("Year must be between 1 and 9999");
        }
        if (month == null || month < 1 || month > 12) {
            throw new InvalidBudgetException("Month must be between 1 and 12");
        }
        return YearMonth.of(year, month);
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(MIN_AMOUNT) < 0) {
            throw new InvalidBudgetException("Budget amount must be at least 0.01");
        }
        if (amount.scale() > 2 || (long) amount.precision() - amount.scale() > 17) {
            throw new InvalidBudgetException("Budget amount must have at most 17 integer and 2 fractional digits");
        }
    }

    private BigDecimal spendingForBudget(Budget budget, Long userId) {
        YearMonth period = validatePeriod(budget.getYear(), budget.getMonth());
        Long categoryId = budget.getCategory().getId();
        return spendingByCategory(userId, List.of(categoryId), period)
                .getOrDefault(categoryId, ZERO_AMOUNT);
    }

    private Map<Long, BigDecimal> spendingByCategory(Long userId, List<Long> categoryIds, YearMonth period) {
        List<CategoryExpenseTotal> totals = transactionRepository.sumExpensesByCategory(
                userId, categoryIds, period.atDay(1), period.plusMonths(1).atDay(1));

        Map<Long, BigDecimal> spending = new HashMap<>();
        for (CategoryExpenseTotal total : totals) {
            spending.put(total.getCategoryId(), total.getSpentAmount());
        }
        return spending;
    }

    private BudgetDetails toDetails(Budget budget, BigDecimal spentAmount) {
        return new BudgetDetails(
                budget.getId(),
                budget.getCategory().getId(),
                budget.getCategory().getName(),
                budget.getYear(),
                budget.getMonth(),
                budget.getAmount(),
                spentAmount,
                budget.getAmount().subtract(spentAmount),
                spentAmount.compareTo(budget.getAmount()) > 0,
                budget.getCreatedAt(),
                budget.getUpdatedAt()
        );
    }

    private boolean isBudgetDuplicate(DataIntegrityViolationException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation
                    && UNIQUE_CONSTRAINT.equals(violation.getConstraintName())
                    && "23505".equals(violation.getSQLState())) {
                return true;
            }
        }
        return false;
    }
}
