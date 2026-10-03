package com.deepak.cointrailapi.budget;

import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.user.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class BudgetRepositoryTest {
    @Container @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");
    @Autowired private BudgetRepository repository;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private EntityManager entityManager;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void shouldRoundTripMappingAndUseOwnerForLookup() {
        User owner = user("budget-mapping@test.com");
        User other = user("budget-other@test.com");
        Category food = category("Food");
        Budget saved = repository.saveAndFlush(budget(owner, food, 2024, 2));
        Long id = saved.getId();
        entityManager.clear();
        Budget reloaded = repository.findByIdAndUserId(id, owner.getId()).orElseThrow();
        assertThat(reloaded.getUser().getId()).isEqualTo(owner.getId());
        assertThat(reloaded.getCategory().getId()).isEqualTo(food.getId());
        assertThat(reloaded.getCategory().getName()).isEqualTo("Food");
        assertThat(reloaded.getYear()).isEqualTo(2024);
        assertThat(reloaded.getMonth()).isEqualTo(2);
        assertThat(reloaded.getAmount()).isEqualByComparingTo("100.00");
        assertThat(reloaded.getCreatedAt()).isEqualTo(LocalDateTime.of(2024, 1, 1, 0, 0));
        assertThat(reloaded.getUpdatedAt()).isEqualTo(reloaded.getCreatedAt());
        assertThat(repository.findByIdAndUserId(id, other.getId())).isEmpty();
        assertThat(repository.findByIdAndUserId(Long.MAX_VALUE, owner.getId())).isEmpty();
        assertThat(repository.existsByUserIdAndCategoryIdAndYearAndMonth(owner.getId(), food.getId(), 2024, 2)).isTrue();
        assertThat(repository.existsByUserIdAndCategoryIdAndYearAndMonth(other.getId(), food.getId(), 2024, 2)).isFalse();
    }

    @Test
    void shouldRejectCompositeDuplicateWithNamedConstraint() {
        User user = user("budget-duplicate@test.com");
        Category food = category("Food");
        repository.saveAndFlush(budget(user, food, 2024, 2));
        assertThatThrownBy(() -> repository.saveAndFlush(budget(user, food, 2024, 2)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasStackTraceContaining("uq_budgets_user_category_period");
    }

    @Test
    void shouldAllowDifferentUsersCategoriesYearsAndMonths() {
        User first = user("budget-independent-a@test.com");
        User second = user("budget-independent-b@test.com");
        Category food = category("Food");
        repository.saveAllAndFlush(List.of(budget(first, food, 2024, 2), budget(second, food, 2024, 2),
                budget(first, category("Shopping"), 2024, 2), budget(first, food, 2025, 2), budget(first, food, 2024, 3)));
        assertThat(repository.count()).isEqualTo(5);
    }

    @Test
    void shouldListOnlyOwnerAndPeriodInCategoryOrderIncludingInactiveCategories() {
        User owner = user("budget-list-a@test.com");
        User other = user("budget-list-b@test.com");
        Category food = category("Food");
        Category shopping = category("Shopping");
        repository.saveAndFlush(budget(owner, shopping, 2024, 2));
        repository.saveAndFlush(budget(owner, food, 2024, 2));
        repository.saveAndFlush(budget(other, food, 2024, 2));
        repository.saveAndFlush(budget(owner, food, 2024, 3));
        repository.saveAndFlush(budget(owner, food, 2025, 2));
        food.setActive(false);
        categoryRepository.saveAndFlush(food);
        entityManager.clear();
        List<Budget> results = repository.findByUserIdAndYearAndMonthOrderByCategoryIdAscIdAsc(owner.getId(), 2024, 2);
        assertThat(results).extracting(b -> b.getCategory().getId())
                .containsExactlyElementsOf(List.of(food.getId(), shopping.getId()).stream().sorted().toList());
        assertThat(repository.findByUserIdAndYearAndMonthOrderByCategoryIdAscIdAsc(owner.getId(), 2023, 2)).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({"0,2,chk_budgets_year", "10000,2,chk_budgets_year", "2024,0,chk_budgets_month", "2024,13,chk_budgets_month"})
    void shouldEnforcePeriodChecks(int year, int month, String constraint) {
        Budget budget = budget(user("budget-period@test.com"), category("Food"), year, month);
        assertThatThrownBy(() -> repository.saveAndFlush(budget)).isInstanceOf(DataIntegrityViolationException.class)
                .hasStackTraceContaining(constraint);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.00", "-0.01"})
    void shouldEnforcePositiveAmount(String amount) {
        Budget budget = budget(user("budget-amount@test.com"), category("Food"), 2024, 2);
        budget.setAmount(new BigDecimal(amount));
        assertThatThrownBy(() -> repository.saveAndFlush(budget)).isInstanceOf(DataIntegrityViolationException.class)
                .hasStackTraceContaining("chk_budgets_amount");
    }

    @ParameterizedTest
    @CsvSource({"1,1,0.01", "9999,12,99999999999999999.99"})
    void shouldPersistPeriodAndNumericBoundaries(int year, int month, String amount) {
        Budget budget = budget(user("budget-boundary@test.com"), category("Food"), year, month);
        budget.setAmount(new BigDecimal(amount));
        Long id = repository.saveAndFlush(budget).getId();
        entityManager.clear();
        Budget saved = repository.findById(id).orElseThrow();
        assertThat(saved.getAmount()).isEqualByComparingTo(amount);
        assertThat(saved.getYear()).isEqualTo(year);
        assertThat(saved.getMonth()).isEqualTo(month);
    }

    @Test
    void shouldRejectNumericOverflow() {
        Budget budget = budget(user("budget-overflow@test.com"), category("Food"), 2024, 2);
        budget.setAmount(new BigDecimal("100000000000000000.00"));
        assertThatThrownBy(() -> repository.saveAndFlush(budget)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"user_id", "category_id", "year", "month", "amount", "created_at", "updated_at"})
    void shouldEnforceEveryRequiredColumnInPostgres(String missing) {
        User user = user("budget-required@test.com");
        Category food = category("Food");
        // Native insert bypasses Hibernate null checks to prove the Flyway NOT NULL constraints.
        Object[] values = {user.getId(), food.getId(), 2024, 2, new BigDecimal("1.00"), LocalDateTime.now(), LocalDateTime.now()};
        List<String> columns = List.of("user_id", "category_id", "year", "month", "amount", "created_at", "updated_at");
        values[columns.indexOf(missing)] = null;
        assertThatThrownBy(() -> jdbc.update("INSERT INTO budgets (user_id,category_id,year,month,amount,created_at,updated_at) VALUES (?,?,?,?,?,?,?)", values))
                .isInstanceOf(DataIntegrityViolationException.class).hasStackTraceContaining(missing);
    }

    @ParameterizedTest
    @ValueSource(strings = {"user", "category"})
    void shouldEnforceForeignKeys(String missing) {
        User user = user("budget-fk@test.com");
        Category food = category("Food");
        assertThatThrownBy(() -> jdbc.update("INSERT INTO budgets (user_id,category_id,year,month,amount,created_at,updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
                missing.equals("user") ? Long.MAX_VALUE : user.getId(),
                missing.equals("category") ? Long.MAX_VALUE : food.getId(), 2024, 2, new BigDecimal("1.00")))
                .isInstanceOf(DataIntegrityViolationException.class).hasStackTraceContaining("fk_budgets_" + missing);
    }

    private User user(String email) {
        User user = new User();
        user.setName("Budget Test");
        user.setEmail(email);
        user.setPassword("password");
        user.setRole(Role.USER);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.saveAndFlush(user);
    }

    private Category category(String name) {
        return categoryRepository.findAll().stream().filter(c -> c.isSystem() && c.getName().equals(name)).findFirst().orElseThrow();
    }

    private Budget budget(User user, Category category, int year, int month) {
        Budget budget = new Budget();
        budget.setUser(user);
        budget.setCategory(category);
        budget.setYear(year);
        budget.setMonth(month);
        budget.setAmount(new BigDecimal("100.00"));
        budget.setCreatedAt(LocalDateTime.of(2024, 1, 1, 0, 0));
        budget.setUpdatedAt(budget.getCreatedAt());
        return budget;
    }
}
