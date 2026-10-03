package com.deepak.cointrailapi.budget;

import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.common.exception.*;
import com.deepak.cointrailapi.transaction.CategoryExpenseTotal;
import com.deepak.cointrailapi.transaction.TransactionRepository;
import com.deepak.cointrailapi.user.Role;
import com.deepak.cointrailapi.user.User;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BudgetServiceImplTest {
    @Mock private BudgetRepository budgetRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private TransactionRepository transactionRepository;
    @InjectMocks private BudgetServiceImpl service;
    private User user;
    private Category category;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setRole(Role.USER);
        category = new Category();
        category.setId(20L);
        category.setName("Food");
        category.setType(CategoryType.EXPENSE);
        category.setSystem(true);
        category.setActive(true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    @AfterEach
    void tearDown() { SecurityContextHolder.clearContext(); }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void shouldCreateForSystemOrOwnCustomCategory(boolean system) {
        category.setSystem(system);
        category.setUser(system ? null : user);
        eligible();
        when(budgetRepository.saveAndFlush(any(Budget.class))).thenAnswer(call -> {
            Budget saved = call.getArgument(0);
            saved.setId(100L);
            return saved;
        });
        LocalDateTime before = LocalDateTime.now();
        BudgetDetails result = service.createBudget(20L, 2024, 2, new BigDecimal("100.00"));
        assertThat(result.id()).isEqualTo(100L);
        assertThat(result.categoryId()).isEqualTo(20L);
        assertThat(result.categoryName()).isEqualTo("Food");
        assertThat(result.year()).isEqualTo(2024);
        assertThat(result.month()).isEqualTo(2);
        assertThat(result.amount()).isEqualByComparingTo("100.00");
        assertThat(result.spentAmount()).isEqualByComparingTo("0.00");
        assertThat(result.remainingAmount()).isEqualByComparingTo("100.00");
        assertThat(result.overBudget()).isFalse();
        assertThat(result.createdAt()).isBetween(before, LocalDateTime.now());
        assertThat(result.updatedAt()).isEqualTo(result.createdAt());
        ArgumentCaptor<Budget> captor = ArgumentCaptor.forClass(Budget.class);
        verify(budgetRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getUser()).isSameAs(user);
        verify(transactionRepository).sumExpensesByCategory(1L, List.of(20L),
                LocalDate.of(2024, 2, 1), LocalDate.of(2024, 3, 1));
    }

    @ParameterizedTest
    @CsvSource({"0.00,100.00,false", "99.99,0.01,false", "100.00,0.00,false", "125.55,-25.55,true"})
    void shouldCalculateProgressExactly(String spent, String remaining, boolean over) {
        when(budgetRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(budget()));
        when(transactionRepository.sumExpensesByCategory(anyLong(), anyList(), any(), any()))
                .thenReturn(List.of(total(20L, spent)));
        BudgetDetails result = service.getBudget(100L);
        assertThat(result.spentAmount()).isEqualByComparingTo(spent);
        assertThat(result.remainingAmount()).isEqualByComparingTo(remaining);
        assertThat(result.overBudget()).isEqualTo(over);
    }

    @Test
    void shouldMapMonthlyListWithOneAggregateAndZeroForMissingGroup() {
        Budget first = budget();
        Category other = new Category();
        other.setId(30L);
        other.setName("Shopping");
        Budget second = budget();
        second.setId(101L);
        second.setCategory(other);
        when(budgetRepository.findByUserIdAndYearAndMonthOrderByCategoryIdAscIdAsc(1L, 2024, 2))
                .thenReturn(List.of(first, second));
        when(transactionRepository.sumExpensesByCategory(1L, List.of(20L, 30L),
                LocalDate.of(2024, 2, 1), LocalDate.of(2024, 3, 1)))
                .thenReturn(List.of(total(20L, "12.34")));
        List<BudgetDetails> result = service.getBudgets(2024, 2);
        assertThat(result).extracting(BudgetDetails::id).containsExactly(100L, 101L);
        assertThat(result.getFirst().remainingAmount()).isEqualByComparingTo("87.66");
        assertThat(result.getLast().spentAmount()).isEqualByComparingTo("0.00");
        assertThat(result.getLast().categoryName()).isEqualTo("Shopping");
        verify(transactionRepository, times(1)).sumExpensesByCategory(anyLong(), anyList(), any(), any());
    }

    @Test
    void shouldSkipAggregateForEmptyList() {
        assertThat(service.getBudgets(2024, 2)).isEmpty();
        verifyNoInteractions(transactionRepository);
    }

    @Test
    void shouldUpdateOnlyAmountAndUpdatedAtEvenForInactiveRenamedCategory() {
        Budget existing = budget();
        LocalDateTime created = existing.getCreatedAt();
        category.setActive(false);
        category.setName("Renamed Food");
        when(budgetRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(existing));
        when(budgetRepository.save(existing)).thenReturn(existing);
        BudgetDetails result = service.updateBudget(100L, new BigDecimal("50.00"));
        assertThat(result.amount()).isEqualByComparingTo("50.00");
        assertThat(result.createdAt()).isEqualTo(created);
        assertThat(result.updatedAt()).isAfter(created);
        assertThat(result.categoryName()).isEqualTo("Renamed Food");
        assertThat(existing.getUser()).isSameAs(user);
        assertThat(existing.getCategory()).isSameAs(category);
        assertThat(result.year()).isEqualTo(2024);
        assertThat(result.month()).isEqualTo(2);
        verifyNoInteractions(categoryRepository);
    }

    @Test
    void shouldHardDeleteOwnedBudget() {
        Budget existing = budget();
        when(budgetRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(existing));
        service.deleteBudget(100L);
        verify(budgetRepository).delete(existing);
        verifyNoInteractions(transactionRepository, categoryRepository);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {-1, 0, 100, 999})
    void shouldUseSameNotFoundForInvalidAbsentOrInaccessibleBudget(Long id) {
        assertThatThrownBy(() -> service.getBudget(id)).isInstanceOf(BudgetNotFoundException.class).hasMessage("Budget not found");
        assertThatThrownBy(() -> service.updateBudget(id, null)).isInstanceOf(BudgetNotFoundException.class).hasMessage("Budget not found");
        assertThatThrownBy(() -> service.deleteBudget(id)).isInstanceOf(BudgetNotFoundException.class).hasMessage("Budget not found");
        verify(budgetRepository, never()).save(any());
        verify(budgetRepository, never()).delete(any());
        verifyNoInteractions(transactionRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing", "unauthenticated", "wrongPrincipal"})
    void shouldRejectInvalidAuthenticationForEveryOperation(String state) {
        SecurityContextHolder.clearContext();
        if (state.equals("unauthenticated")) {
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null));
        } else if (state.equals("wrongPrincipal")) {
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("email@test.com", null, List.of()));
        }
        assertThatThrownBy(() -> service.createBudget(20L, 2024, 2, BigDecimal.ONE)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getBudgets(2024, 2)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getBudget(100L)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.updateBudget(100L, BigDecimal.ONE)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.deleteBudget(100L)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(budgetRepository, categoryRepository, transactionRepository);
    }

    @Test
    void shouldRejectMissingOrInactiveCategory() {
        assertThatThrownBy(() -> service.createBudget(20L, 2024, 2, BigDecimal.ONE))
                .isInstanceOf(CategoryNotFoundException.class).hasMessage("Category not found");
        verifyNoInteractions(budgetRepository, transactionRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void shouldHideForeignCategoryBeforeCheckingTypeOrDuplicate(boolean income) {
        User foreign = new User();
        foreign.setId(2L);
        category.setSystem(false);
        category.setUser(foreign);
        category.setType(income ? CategoryType.INCOME : CategoryType.EXPENSE);
        eligible();
        assertThatThrownBy(() -> service.createBudget(20L, 2024, 2, BigDecimal.ONE))
                .isInstanceOf(CategoryNotFoundException.class);
        verifyNoInteractions(budgetRepository, transactionRepository);
    }

    @Test
    void shouldRejectAccessibleIncomeCategory() {
        category.setType(CategoryType.INCOME);
        eligible();
        assertThatThrownBy(() -> service.createBudget(20L, 2024, 2, BigDecimal.ONE))
                .isInstanceOf(InvalidBudgetException.class).hasMessage("Budgets require an expense category");
        verifyNoInteractions(budgetRepository, transactionRepository);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0, -1})
    void shouldRejectInvalidCategoryId(Long id) {
        assertThatThrownBy(() -> service.createBudget(id, 2024, 2, BigDecimal.ONE)).isInstanceOf(InvalidBudgetException.class);
        verifyNoInteractions(budgetRepository, categoryRepository, transactionRepository);
    }

    @Test
    void shouldRejectDuplicateBeforePersisting() {
        eligible();
        when(budgetRepository.existsByUserIdAndCategoryIdAndYearAndMonth(1L, 20L, 2024, 2)).thenReturn(true);
        assertThatThrownBy(() -> service.createBudget(20L, 2024, 2, BigDecimal.ONE)).isInstanceOf(BudgetAlreadyExistsException.class);
        verify(budgetRepository, never()).saveAndFlush(any());
        verifyNoInteractions(transactionRepository);
    }

    @ParameterizedTest
    @CsvSource({"uq_budgets_user_category_period,23505,true", "other_unique,23505,false", "uq_budgets_user_category_period,23503,false"})
    void shouldTranslateOnlyNamedUniqueViolation(String name, String sqlState, boolean duplicate) {
        eligible();
        DataIntegrityViolationException failure = new DataIntegrityViolationException("insert failed",
                new RuntimeException(new ConstraintViolationException("constraint", new SQLException("database", sqlState), "insert", name)));
        when(budgetRepository.saveAndFlush(any())).thenThrow(failure);
        if (duplicate) {
            assertThatThrownBy(() -> service.createBudget(20L, 2024, 2, BigDecimal.ONE))
                    .isInstanceOf(BudgetAlreadyExistsException.class).hasCause(failure);
        } else {
            assertThatThrownBy(() -> service.createBudget(20L, 2024, 2, BigDecimal.ONE)).isSameAs(failure);
        }
        verifyNoInteractions(transactionRepository);
        verify(budgetRepository, times(1)).existsByUserIdAndCategoryIdAndYearAndMonth(1L, 20L, 2024, 2);
    }

    static Stream<Arguments> invalidPeriods() {
        return Stream.of(Arguments.of(null, 2), Arguments.of(0, 2), Arguments.of(10000, 2),
                Arguments.of(2024, null), Arguments.of(2024, 0), Arguments.of(2024, 13));
    }

    @ParameterizedTest
    @MethodSource("invalidPeriods")
    void shouldRejectInvalidPeriodWithoutPersistence(Integer year, Integer month) {
        assertThatThrownBy(() -> service.createBudget(20L, year, month, BigDecimal.ONE)).isInstanceOf(InvalidBudgetException.class);
        assertThatThrownBy(() -> service.getBudgets(year, month)).isInstanceOf(InvalidBudgetException.class);
        verifyNoInteractions(budgetRepository, categoryRepository, transactionRepository);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"0", "-1", "0.001", "1.001", "1.000", "100000000000000000", "1E+18"})
    void shouldRejectInvalidAmountWithoutMutatingOrPersisting(String value) {
        BigDecimal amount = value == null ? null : new BigDecimal(value);
        assertThatThrownBy(() -> service.createBudget(20L, 2024, 2, amount)).isInstanceOf(InvalidBudgetException.class);
        Budget existing = budget();
        LocalDateTime updated = existing.getUpdatedAt();
        when(budgetRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(existing));
        assertThatThrownBy(() -> service.updateBudget(100L, amount)).isInstanceOf(InvalidBudgetException.class);
        assertThat(existing.getAmount()).isEqualByComparingTo("100.00");
        assertThat(existing.getUpdatedAt()).isEqualTo(updated);
        verify(budgetRepository, never()).save(any());
        verify(budgetRepository, never()).saveAndFlush(any());
        verifyNoInteractions(categoryRepository, transactionRepository);
    }

    @ParameterizedTest
    @CsvSource({"1,1,0.01", "9999,12,99999999999999999.99", "2024,2,1E+16"})
    void shouldAcceptBoundaryPeriodsAndAmounts(int year, int month, String amount) {
        eligible();
        when(budgetRepository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        assertThat(service.createBudget(20L, year, month, new BigDecimal(amount)).amount()).isEqualByComparingTo(amount);
        YearMonth period = YearMonth.of(year, month);
        verify(transactionRepository).sumExpensesByCategory(1L, List.of(20L), period.atDay(1), period.plusMonths(1).atDay(1));
    }

    private void eligible() { when(categoryRepository.findByIdAndActiveTrue(20L)).thenReturn(Optional.of(category)); }

    private Budget budget() {
        Budget budget = new Budget();
        budget.setId(100L);
        budget.setUser(user);
        budget.setCategory(category);
        budget.setYear(2024);
        budget.setMonth(2);
        budget.setAmount(new BigDecimal("100.00"));
        budget.setCreatedAt(LocalDateTime.of(2024, 1, 1, 0, 0));
        budget.setUpdatedAt(budget.getCreatedAt());
        return budget;
    }

    private CategoryExpenseTotal total(Long id, String amount) {
        return new CategoryExpenseTotal() {
            public Long getCategoryId() { return id; }
            public BigDecimal getSpentAmount() { return new BigDecimal(amount); }
        };
    }
}
