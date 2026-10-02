package com.deepak.cointrailapi.account;

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
import java.time.LocalDateTime;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class AccountRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;


    @Test
    void shouldSaveAccountForUser() {

        User user = createUser("account-test@example.com");

        Account account = createAccount(
                user,
                "HDFC Savings",
                AccountType.BANK,
                new BigDecimal("50000.00")
        );

        Account savedAccount = accountRepository.saveAndFlush(account);

        assertThat(savedAccount.getId()).isNotNull();
        assertThat(savedAccount.getName()).isEqualTo("HDFC Savings");
        assertThat(savedAccount.getType()).isEqualTo(AccountType.BANK);
        assertThat(savedAccount.getOpeningBalance())
                .isEqualByComparingTo("50000.00");
        assertThat(savedAccount.isActive()).isTrue();
        assertThat(savedAccount.getUser().getId())
                .isEqualTo(user.getId());
    }

    @Test
    void shouldAllowSameAccountNameForDifferentUsers() {

        User firstUser = createUser("first-account-test@example.com");
        User secondUser = createUser("second-account-test@example.com");

        accountRepository.saveAndFlush(
                createAccount(
                        firstUser,
                        "HDFC Savings",
                        AccountType.BANK,
                        BigDecimal.ZERO
                )
        );

        Account secondAccount = accountRepository.saveAndFlush(
                createAccount(
                        secondUser,
                        "HDFC Savings",
                        AccountType.BANK,
                        BigDecimal.ZERO
                )
        );

        assertThat(secondAccount.getId()).isNotNull();
    }

    @Test
    void shouldRejectDuplicateAccountNameForSameUserIgnoringCase() {

        User user = createUser("duplicate-account-test@example.com");

        accountRepository.saveAndFlush(
                createAccount(
                        user,
                        "HDFC Savings",
                        AccountType.BANK,
                        BigDecimal.ZERO
                )
        );

        Account duplicateAccount = createAccount(
                user,
                "hdfc savings",
                AccountType.BANK,
                BigDecimal.ZERO
        );

        assertThatThrownBy(() ->
                accountRepository.saveAndFlush(duplicateAccount)
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldAllowNegativeOpeningBalance() {

        User user = createUser("credit-card-test@example.com");

        Account account = createAccount(
                user,
                "ICICI Credit Card",
                AccountType.CREDIT_CARD,
                new BigDecimal("-10000.00")
        );

        Account savedAccount = accountRepository.saveAndFlush(account);

        assertThat(savedAccount.getOpeningBalance())
                .isEqualByComparingTo("-10000.00");
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

    private Account createAccount(
            User user,
            String name,
            AccountType type,
            BigDecimal openingBalance) {

        Account account = new Account();

        account.setUser(user);
        account.setName(name);
        account.setType(type);
        account.setOpeningBalance(openingBalance);
        account.setActive(true);
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        return account;
    }

}
