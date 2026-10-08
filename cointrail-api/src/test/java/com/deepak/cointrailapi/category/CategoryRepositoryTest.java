package com.deepak.cointrailapi.category;

import com.deepak.cointrailapi.user.Role;
import com.deepak.cointrailapi.user.User;
import com.deepak.cointrailapi.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class CategoryRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldLoadSeededSystemCategories() {
        List<Category> categories = categoryRepository.findAll();

        assertThat(categories).hasSize(15);
    }


    @Test
    void shouldContainExpenseAndIncomeCategories() {
        List<Category> categories = categoryRepository.findAll();

        assertThat(categories)
                .anyMatch(category ->
                        category.getName().equals("Food")
                                && category.getType() == CategoryType.EXPENSE);

        assertThat(categories)
                .anyMatch(category ->
                        category.getName().equals("Salary")
                                && category.getType() == CategoryType.INCOME);
    }

    @Test
    void systemCategoriesShouldNotBelongToAUser() {

        List<Category> categories = categoryRepository.findAll();

        assertThat(categories)
                .allMatch(category ->
                        category.isSystem()
                                && category.isActive()
                                && category.getUser() == null);
    }

    @Test
    void shouldRejectDuplicateSystemCategoryIgnoringCase() {

        Category category = new Category();
        category.setName("food");
        category.setType(CategoryType.EXPENSE);
        category.setSystem(true);
        category.setActive(true);
        category.setUser(null);
        category.setCreatedAt(LocalDateTime.now());
        category.setUpdatedAt(LocalDateTime.now());

        assertThatThrownBy(() ->
                categoryRepository.saveAndFlush(category)
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectDuplicateUserCategoryIgnoringCase() {

        User user = createUser("category-duplicate@test.com");

        Category first = createCustomCategory(
                user,
                "Pet Care",
                CategoryType.EXPENSE
        );

        categoryRepository.saveAndFlush(first);

        Category duplicate = createCustomCategory(
                user,
                "pet care",
                CategoryType.EXPENSE
        );

        assertThatThrownBy(() ->
                categoryRepository.saveAndFlush(duplicate)
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldAllowSameCategoryNameForDifferentUsers() {

        User user1 = createUser("category-user1@test.com");
        User user2 = createUser("category-user2@test.com");

        Category category1 = createCustomCategory(
                user1,
                "Pet Care",
                CategoryType.EXPENSE
        );

        Category category2 = createCustomCategory(
                user2,
                "Pet Care",
                CategoryType.EXPENSE
        );

        Category saved1 =
                categoryRepository.saveAndFlush(category1);

        Category saved2 =
                categoryRepository.saveAndFlush(category2);

        assertThat(saved1.getId()).isNotNull();
        assertThat(saved2.getId()).isNotNull();
    }

    @Test
    void shouldAllowSameCategoryNameWithDifferentTypesForSameUser() {

        User user = createUser("category-type@test.com");

        Category expenseCategory = createCustomCategory(
                user,
                "Other",
                CategoryType.EXPENSE
        );

        Category incomeCategory = createCustomCategory(
                user,
                "Other",
                CategoryType.INCOME
        );

        Category savedExpense =
                categoryRepository.saveAndFlush(expenseCategory);

        Category savedIncome =
                categoryRepository.saveAndFlush(incomeCategory);

        assertThat(savedExpense.getId()).isNotNull();
        assertThat(savedIncome.getId()).isNotNull();
    }

    private User createUser(String email) {

        User user = new User();
        user.setName("Test User");
        user.setEmail(email);
        user.setPassword("password");
        user.setRole(Role.USER);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        return userRepository.saveAndFlush(user);
    }

    private Category createCustomCategory(
            User user,
            String name,
            CategoryType type) {

        Category category = new Category();

        category.setName(name);
        category.setType(type);
        category.setSystem(false);
        category.setActive(true);
        category.setUser(user);
        category.setCreatedAt(LocalDateTime.now());
        category.setUpdatedAt(LocalDateTime.now());

        return category;
    }

    @Test
    void duplicateReportsExpectedPostgresSystemIndex() {
        Category category = new Category();
        category.setName("food"); category.setType(CategoryType.EXPENSE);
        category.setSystem(true); category.setActive(true);
        category.setCreatedAt(LocalDateTime.now()); category.setUpdatedAt(LocalDateTime.now());
        try {
            categoryRepository.saveAndFlush(category);
            org.junit.jupiter.api.Assertions.fail("Expected unique violation");
        } catch (DataIntegrityViolationException failure) {
            ConstraintViolationException violation = (ConstraintViolationException) failure.getCause();
            assertThat(violation.getConstraintName()).isEqualTo("uq_categories_system_name_type");
            assertThat(violation.getSQLState()).isEqualTo("23505");
        }
    }

    @Test
    void duplicateReportsExpectedPostgresCustomIndex() {
        User user = createUser("custom-constraint-name@test.com");
        categoryRepository.saveAndFlush(createCustomCategory(user, "Constraint", CategoryType.EXPENSE));
        try {
            categoryRepository.saveAndFlush(createCustomCategory(user, "constraint", CategoryType.EXPENSE));
            org.junit.jupiter.api.Assertions.fail("Expected unique violation");
        } catch (DataIntegrityViolationException failure) {
            ConstraintViolationException violation = (ConstraintViolationException) failure.getCause();
            assertThat(violation.getConstraintName()).isEqualTo("uq_categories_user_name_type");
            assertThat(violation.getSQLState()).isEqualTo("23505");
        }
    }
}
