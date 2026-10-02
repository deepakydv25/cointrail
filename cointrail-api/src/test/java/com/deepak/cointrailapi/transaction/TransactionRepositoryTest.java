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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
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
}
