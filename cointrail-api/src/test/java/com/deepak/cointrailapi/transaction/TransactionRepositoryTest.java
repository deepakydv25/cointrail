package com.deepak.cointrailapi.transaction;

import com.deepak.cointrailapi.account.Account;
import com.deepak.cointrailapi.account.AccountRepository;
import com.deepak.cointrailapi.account.AccountType;
import com.deepak.cointrailapi.category.Category;
import com.deepak.cointrailapi.category.CategoryRepository;
import com.deepak.cointrailapi.category.CategoryType;
import com.deepak.cointrailapi.user.Role;
import com.deepak.cointrailapi.user.User;
import com.deepak.cointrailapi.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class TransactionRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void shouldSaveExpenseTransaction() {
        User user = createUser("expense-transaction@test.com");
        Account account = createAccount(user);

        Category category = findCategory("Food", CategoryType.EXPENSE);

        Transaction transaction = createTransaction(
                user,
                account,
                category,
                TransactionType.EXPENSE,
                new BigDecimal("500.00")
        );

        Transaction saved = transactionRepository.saveAndFlush(transaction);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getType()).isEqualTo(TransactionType.EXPENSE);
        assertThat(saved.getAmount()).isEqualByComparingTo("500.00");
        assertThat(saved.getAccount().getId()).isEqualTo(account.getId());
        assertThat(saved.getCategory().getId()).isEqualTo(category.getId());
        assertThat(saved.getUser().getId()).isEqualTo(user.getId());
    }

    @Test
    void shouldSaveIncomeTransaction() {
        User user = createUser("income-transaction@test.com");
        Account account = createAccount(user);

        Category category = findCategory("Salary", CategoryType.INCOME);

        Transaction transaction = createTransaction(
                user,
                account,
                category,
                TransactionType.INCOME,
                new BigDecimal("80000.00")
        );

        Transaction saved = transactionRepository.saveAndFlush(transaction);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getType()).isEqualTo(TransactionType.INCOME);
        assertThat(saved.getAmount()).isEqualByComparingTo("80000.00");
    }

    @Test
    void shouldRejectZeroAmount() {
        User user = createUser("zero-transaction@test.com");
        Account account = createAccount(user);
        Category category = findCategory("Food", CategoryType.EXPENSE);

        Transaction transaction = createTransaction(
                user,
                account,
                category,
                TransactionType.EXPENSE,
                BigDecimal.ZERO
        );

        assertThatThrownBy(() ->
                transactionRepository.saveAndFlush(transaction)
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectNegativeAmount() {
        User user = createUser("negative-transaction@test.com");
        Account account = createAccount(user);
        Category category = findCategory("Food", CategoryType.EXPENSE);

        Transaction transaction = createTransaction(
                user,
                account,
                category,
                TransactionType.EXPENSE,
                new BigDecimal("-500.00")
        );

        assertThatThrownBy(() ->
                transactionRepository.saveAndFlush(transaction)
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldFilterTransactionsByUser() {

        User user1 = createUser("user1@test.com");
        User user2 = createUser("user2@test.com");

        Account account1 = createAccount(user1);
        Account account2 = createAccount(user2);

        Category food =
                findCategory("Food", CategoryType.EXPENSE);

        Transaction user1Transaction = createTransaction(
                user1,
                account1,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("500.00")
        );

        Transaction user2Transaction = createTransaction(
                user2,
                account2,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("1000.00")
        );

        transactionRepository.saveAllAndFlush(List.of(user1Transaction, user2Transaction));

        Specification<Transaction> specification =
                TransactionSpecification.hasUserId(user1.getId());

        Page<Transaction> result =
                transactionRepository.findAll(
                        specification,
                        PageRequest.of(0, 20)
                );

        assertThat(result.getContent()).hasSize(1);

        Transaction transaction =
                result.getContent().getFirst();

        assertThat(transaction.getUser().getId())
                .isEqualTo(user1.getId());

        assertThat(transaction.getAmount())
                .isEqualByComparingTo("500.00");
    }

    @Test
    void shouldFilterTransactionsByType() {

        User user = createUser("type-filter@test.com");
        Account account = createAccount(user);

        Category food =
                findCategory("Food", CategoryType.EXPENSE);

        Category salary =
                findCategory("Salary", CategoryType.INCOME);

        Transaction expense = createTransaction(
                user,
                account,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("500.00")
        );

        Transaction income = createTransaction(
                user,
                account,
                salary,
                TransactionType.INCOME,
                new BigDecimal("80000.00")
        );

        transactionRepository.saveAllAndFlush(
                List.of(expense, income)
        );

        Specification<Transaction> specification =
                TransactionSpecification.hasUserId(user.getId())
                        .and(
                                TransactionSpecification.hasType(
                                        TransactionType.EXPENSE
                                )
                        );

        Page<Transaction> result =
                transactionRepository.findAll(
                        specification,
                        PageRequest.of(0, 20)
                );

        assertThat(result.getContent()).hasSize(1);

        assertThat(result.getContent().getFirst().getType())
                .isEqualTo(TransactionType.EXPENSE);

        assertThat(result.getContent().getFirst().getAmount())
                .isEqualByComparingTo("500.00");
    }

    @Test
    void shouldFilterTransactionsByAccountAndCategory() {

        User user =
                createUser("account-category-filter@test.com");

        Account hdfc =
                createAccount(user, "HDFC");

        Account icici =
                createAccount(user, "ICICI");

        Category food =
                findCategory("Food", CategoryType.EXPENSE);

        Category shopping =
                findCategory("Shopping", CategoryType.EXPENSE);

        Transaction foodHdfc = createTransaction(
                user,
                hdfc,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("500.00")
        );

        Transaction shoppingHdfc = createTransaction(
                user,
                hdfc,
                shopping,
                TransactionType.EXPENSE,
                new BigDecimal("2000.00")
        );

        Transaction foodIcici = createTransaction(
                user,
                icici,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("700.00")
        );

        transactionRepository.saveAllAndFlush(
                List.of(
                        foodHdfc,
                        shoppingHdfc,
                        foodIcici
                )
        );

        Specification<Transaction> specification =
                TransactionSpecification
                        .hasUserId(user.getId())
                        .and(
                                TransactionSpecification
                                        .hasAccountId(hdfc.getId())
                        )
                        .and(
                                TransactionSpecification
                                        .hasCategoryId(food.getId())
                        );

        Page<Transaction> result =
                transactionRepository.findAll(
                        specification,
                        PageRequest.of(0, 20)
                );

        assertThat(result.getContent()).hasSize(1);

        Transaction transaction =
                result.getContent().getFirst();

        assertThat(transaction.getAccount().getId())
                .isEqualTo(hdfc.getId());

        assertThat(transaction.getCategory().getId())
                .isEqualTo(food.getId());

        assertThat(transaction.getAmount())
                .isEqualByComparingTo("500.00");
    }

    @Test
    void shouldFilterTransactionsByDateRange() {

        User user =
                createUser("date-filter@test.com");

        Account account = createAccount(user);

        Category food =
                findCategory("Food", CategoryType.EXPENSE);

        Transaction september = createTransaction(
                user,
                account,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("100.00"),
                LocalDate.of(2026, 9, 30)
        );

        Transaction octoberFirst = createTransaction(
                user,
                account,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("200.00"),
                LocalDate.of(2026, 10, 1)
        );

        Transaction octoberFifteenth = createTransaction(
                user,
                account,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("300.00"),
                LocalDate.of(2026, 10, 15)
        );

        Transaction octoberThirtyFirst = createTransaction(
                user,
                account,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("400.00"),
                LocalDate.of(2026, 10, 31)
        );

        Transaction november = createTransaction(
                user,
                account,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("500.00"),
                LocalDate.of(2026, 11, 1)
        );

        transactionRepository.saveAllAndFlush(
                List.of(
                        september,
                        octoberFirst,
                        octoberFifteenth,
                        octoberThirtyFirst,
                        november
                )
        );

        Specification<Transaction> specification =
                TransactionSpecification
                        .hasUserId(user.getId())
                        .and(
                                TransactionSpecification.dateFrom(
                                        LocalDate.of(2026, 10, 1)
                                )
                        )
                        .and(
                                TransactionSpecification.dateTo(
                                        LocalDate.of(2026, 10, 31)
                                )
                        );

        Page<Transaction> result =
                transactionRepository.findAll(
                        specification,
                        PageRequest.of(
                                0,
                                20,
                                Sort.by(
                                        Sort.Direction.ASC,
                                        "transactionDate"
                                )
                        )
                );

        assertThat(result.getContent()).hasSize(3);

        assertThat(result.getContent())
                .extracting(Transaction::getAmount)
                .containsExactly(
                        new BigDecimal("200.00"),
                        new BigDecimal("300.00"),
                        new BigDecimal("400.00")
                );
    }

    @Test
    void shouldApplyCombinedFiltersWithPaginationAndSorting() {

        User user =
                createUser("combined-filter@test.com");

        Account account = createAccount(user);

        Category food =
                findCategory("Food", CategoryType.EXPENSE);

        Transaction first = createTransaction(
                user,
                account,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("100.00"),
                LocalDate.of(2026, 10, 1)
        );

        Transaction second = createTransaction(
                user,
                account,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("300.00"),
                LocalDate.of(2026, 10, 10)
        );

        Transaction third = createTransaction(
                user,
                account,
                food,
                TransactionType.EXPENSE,
                new BigDecimal("200.00"),
                LocalDate.of(2026, 10, 20)
        );

        transactionRepository.saveAllAndFlush(
                List.of(first, second, third)
        );

        Specification<Transaction> specification =
                TransactionSpecification
                        .hasUserId(user.getId())
                        .and(
                                TransactionSpecification.hasType(
                                        TransactionType.EXPENSE
                                )
                        )
                        .and(
                                TransactionSpecification.hasAccountId(
                                        account.getId()
                                )
                        )
                        .and(
                                TransactionSpecification.hasCategoryId(
                                        food.getId()
                                )
                        )
                        .and(
                                TransactionSpecification.dateFrom(
                                        LocalDate.of(2026, 10, 1)
                                )
                        )
                        .and(
                                TransactionSpecification.dateTo(
                                        LocalDate.of(2026, 10, 31)
                                )
                        );

        Page<Transaction> result =
                transactionRepository.findAll(
                        specification,
                        PageRequest.of(
                                0,
                                2,
                                Sort.by(
                                        Sort.Direction.DESC,
                                        "amount"
                                )
                        )
                );

        assertThat(result.getContent()).hasSize(2);

        assertThat(result.getTotalElements())
                .isEqualTo(3);

        assertThat(result.getTotalPages())
                .isEqualTo(2);

        assertThat(result.getContent())
                .extracting(Transaction::getAmount)
                .containsExactly(
                        new BigDecimal("300.00"),
                        new BigDecimal("200.00")
                );
    }

    @Test
    void budgetAggregateShouldGroupAcrossAccountsAndExcludeOtherUsersTypesCategoriesAndDates() {
        User owner = createUser("budget-aggregate-owner@test.com");
        User other = createUser("budget-aggregate-other@test.com");
        Account first = createAccount(owner, "First");
        Account second = createAccount(owner, "Second");
        Account foreign = createAccount(other);
        Category food = findCategory("Food", CategoryType.EXPENSE);
        Category shopping = findCategory("Shopping", CategoryType.EXPENSE);
        Category rent = findCategory("Rent", CategoryType.EXPENSE);
        LocalDate start = LocalDate.of(2024, 2, 1);
        LocalDate end = LocalDate.of(2024, 3, 1);
        transactionRepository.saveAllAndFlush(List.of(
                createTransaction(owner, first, food, TransactionType.EXPENSE, new BigDecimal("10.10"), start),
                createTransaction(owner, second, food, TransactionType.EXPENSE, new BigDecimal("20.20"), start.plusDays(28)),
                createTransaction(owner, first, shopping, TransactionType.EXPENSE, new BigDecimal("3.33"), start.plusDays(1)),
                createTransaction(other, foreign, food, TransactionType.EXPENSE, new BigDecimal("1000"), start),
                // The aggregate must filter transaction type itself, independent of category type.
                createTransaction(owner, first, food, TransactionType.INCOME, new BigDecimal("2000"), start),
                createTransaction(owner, first, rent, TransactionType.EXPENSE, new BigDecimal("3000"), start),
                createTransaction(owner, first, food, TransactionType.EXPENSE, new BigDecimal("4000"), start.minusDays(1)),
                createTransaction(owner, first, food, TransactionType.EXPENSE, new BigDecimal("5000"), end)));
        List<CategoryExpenseTotal> result = transactionRepository.sumExpensesByCategory(
                owner.getId(), List.of(food.getId(), shopping.getId()), start, end);
        assertThat(result).hasSize(2);
        assertThat(result.stream().filter(t -> t.getCategoryId().equals(food.getId())).findFirst().orElseThrow().getSpentAmount())
                .isEqualByComparingTo("30.30");
        assertThat(result.stream().filter(t -> t.getCategoryId().equals(shopping.getId())).findFirst().orElseThrow().getSpentAmount())
                .isEqualByComparingTo("3.33");
    }

    @Test
    void budgetAggregateShouldReturnNoGroupsWithoutMatchingExpenses() {
        User owner = createUser("budget-empty-aggregate@test.com");
        Category food = findCategory("Food", CategoryType.EXPENSE);
        assertThat(transactionRepository.sumExpensesByCategory(owner.getId(), List.of(food.getId()),
                LocalDate.of(2024, 2, 1), LocalDate.of(2024, 3, 1))).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({"2024-02-01,2024-02-29,2024-03-01", "2024-12-01,2024-12-31,2025-01-01", "9999-12-01,9999-12-31,+10000-01-01"})
    void budgetAggregateShouldUseInclusiveStartExclusiveEndAcrossCalendarBoundaries(String from, String last, String to) {
        User owner = createUser("budget-calendar@test.com");
        Account account = createAccount(owner);
        Category food = findCategory("Food", CategoryType.EXPENSE);
        LocalDate start = LocalDate.parse(from);
        LocalDate end = LocalDate.parse(to);
        transactionRepository.saveAllAndFlush(List.of(
                createTransaction(owner, account, food, TransactionType.EXPENSE, new BigDecimal("0.01"), start),
                createTransaction(owner, account, food, TransactionType.EXPENSE, new BigDecimal("0.02"), LocalDate.parse(last)),
                createTransaction(owner, account, food, TransactionType.EXPENSE, new BigDecimal("100"), start.minusDays(1)),
                createTransaction(owner, account, food, TransactionType.EXPENSE, new BigDecimal("200"), end)));
        List<CategoryExpenseTotal> result = transactionRepository.sumExpensesByCategory(owner.getId(), List.of(food.getId()), start, end);
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getSpentAmount()).isEqualByComparingTo("0.03");
    }

    @Test
    void budgetAggregateShouldRetainSpendingFromInactiveAccountAndCategory() {
        User owner = createUser("budget-historical@test.com");
        Account account = createAccount(owner);
        Category food = findCategory("Food", CategoryType.EXPENSE);
        transactionRepository.saveAndFlush(createTransaction(owner, account, food, TransactionType.EXPENSE,
                new BigDecimal("12.34"), LocalDate.of(2024, 2, 20)));
        account.setActive(false);
        food.setActive(false);
        accountRepository.saveAndFlush(account);
        categoryRepository.saveAndFlush(food);
        List<CategoryExpenseTotal> result = transactionRepository.sumExpensesByCategory(owner.getId(), List.of(food.getId()),
                LocalDate.of(2024, 2, 1), LocalDate.of(2024, 3, 1));
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getSpentAmount()).isEqualByComparingTo("12.34");
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

    private Account createAccount(User user) {
        Account account = new Account();
        account.setUser(user);
        account.setName("Test Bank");
        account.setType(AccountType.BANK);
        account.setOpeningBalance(new BigDecimal("50000.00"));
        account.setActive(true);
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        return accountRepository.saveAndFlush(account);
    }

    private Account createAccount(User user, String name) {

        Account account = new Account();

        account.setUser(user);
        account.setName(name);
        account.setType(AccountType.BANK);
        account.setOpeningBalance(
                new BigDecimal("50000.00")
        );
        account.setActive(true);
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        return accountRepository.saveAndFlush(account);
    }

    private Category findCategory(String name, CategoryType type) {
        return categoryRepository.findAll()
                .stream()
                .filter(category ->
                        category.getName().equals(name)
                                && category.getType() == type)
                .findFirst()
                .orElseThrow();
    }

    private Transaction createTransaction(
            User user,
            Account account,
            Category category,
            TransactionType type,
            BigDecimal amount) {

        Transaction transaction = new Transaction();
        transaction.setUser(user);
        transaction.setAccount(account);
        transaction.setCategory(category);
        transaction.setType(type);
        transaction.setAmount(amount);
        transaction.setDescription("Test transaction");
        transaction.setTransactionDate(LocalDate.now());
        transaction.setCreatedAt(LocalDateTime.now());
        transaction.setUpdatedAt(LocalDateTime.now());

        return transaction;
    }

    private Transaction createTransaction(
            User user,
            Account account,
            Category category,
            TransactionType type,
            BigDecimal amount,
            LocalDate transactionDate) {

        Transaction transaction = createTransaction(
                user,
                account,
                category,
                type,
                amount
        );

        transaction.setTransactionDate(transactionDate);

        return transaction;
    }
}
