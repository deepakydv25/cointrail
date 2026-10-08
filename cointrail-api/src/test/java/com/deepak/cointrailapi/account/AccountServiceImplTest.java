package com.deepak.cointrailapi.account;

import com.deepak.cointrailapi.account.dto.AccountResponse;
import com.deepak.cointrailapi.account.dto.CreateAccountRequest;
import com.deepak.cointrailapi.account.dto.UpdateAccountRequest;
import com.deepak.cointrailapi.common.exception.AccountAlreadyExistsException;
import com.deepak.cointrailapi.common.exception.AccountNotFoundException;
import com.deepak.cointrailapi.user.Role;
import com.deepak.cointrailapi.user.User;
import com.deepak.cointrailapi.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.hibernate.exception.ConstraintViolationException;
import java.sql.SQLException;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceImplTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AccountServiceImpl accountService;

    private User user;
    private Account account;

    @BeforeEach
    void setUp() {

        user = new User();
        user.setId(1L);
        user.setName("Test User");
        user.setEmail("test@test.com");
        user.setRole(Role.USER);

        account = new Account();
        account.setId(10L);
        account.setUser(user);
        account.setName("HDFC Savings");
        account.setType(AccountType.BANK);
        account.setOpeningBalance(new BigDecimal("50000.00"));
        account.setActive(true);
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "test@test.com",
                        null,
                        List.of()
                )
        );

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldCreateAccount() {

        CreateAccountRequest request =
                new CreateAccountRequest(
                        "HDFC Savings",
                        AccountType.BANK,
                        new BigDecimal("50000.00")
                );

        when(accountRepository.existsByUserIdAndNameIgnoreCase(
                1L,
                "HDFC Savings"
        )).thenReturn(false);

        when(accountRepository.saveAndFlush(any(Account.class)))
                .thenAnswer(invocation -> {

                    Account saved =
                            invocation.getArgument(0);

                    saved.setId(10L);

                    return saved;
                });

        AccountResponse response =
                accountService.createAccount(request);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.name())
                .isEqualTo("HDFC Savings");
        assertThat(response.type())
                .isEqualTo(AccountType.BANK);
        assertThat(response.openingBalance())
                .isEqualByComparingTo("50000.00");
        assertThat(response.active()).isTrue();

        verify(accountRepository)
                .existsByUserIdAndNameIgnoreCase(
                        1L,
                        "HDFC Savings"
                );

        verify(accountRepository)
                .saveAndFlush(any(Account.class));
    }

    @Test
    void shouldTrimAccountNameWhenCreatingAccount() {

        CreateAccountRequest request =
                new CreateAccountRequest(
                        "  HDFC Savings  ",
                        AccountType.BANK,
                        new BigDecimal("50000.00")
                );

        when(accountRepository.existsByUserIdAndNameIgnoreCase(
                1L,
                "HDFC Savings"
        )).thenReturn(false);

        when(accountRepository.saveAndFlush(any(Account.class)))
                .thenAnswer(invocation ->
                        invocation.getArgument(0)
                );

        AccountResponse response =
                accountService.createAccount(request);

        assertThat(response.name())
                .isEqualTo("HDFC Savings");

        verify(accountRepository)
                .existsByUserIdAndNameIgnoreCase(
                        1L,
                        "HDFC Savings"
                );
    }

    @Test
    void shouldRejectDuplicateAccountName() {

        CreateAccountRequest request =
                new CreateAccountRequest(
                        "HDFC Savings",
                        AccountType.BANK,
                        new BigDecimal("50000.00")
                );

        when(accountRepository.existsByUserIdAndNameIgnoreCase(
                1L,
                "HDFC Savings"
        )).thenReturn(true);

        assertThatThrownBy(() ->
                accountService.createAccount(request))
                .isInstanceOf(
                        AccountAlreadyExistsException.class
                )
                .hasMessage(
                        "Account with this name already exists"
                );

        verify(accountRepository, never())
                .saveAndFlush(any(Account.class));
    }

    @Test
    void shouldGetActiveAccountsForCurrentUser() {

        Account secondAccount = new Account();
        secondAccount.setId(20L);
        secondAccount.setUser(user);
        secondAccount.setName("ICICI Savings");
        secondAccount.setType(AccountType.BANK);
        secondAccount.setOpeningBalance(
                new BigDecimal("25000.00")
        );
        secondAccount.setActive(true);
        secondAccount.setCreatedAt(LocalDateTime.now());
        secondAccount.setUpdatedAt(LocalDateTime.now());

        when(accountRepository
                .findByUserIdAndActiveTrueOrderByCreatedAtDesc(1L))
                .thenReturn(
                        List.of(account, secondAccount)
                );

        List<AccountResponse> result =
                accountService.getAccounts();

        assertThat(result).hasSize(2);

        assertThat(result)
                .extracting(AccountResponse::name)
                .containsExactly(
                        "HDFC Savings",
                        "ICICI Savings"
                );

        verify(accountRepository)
                .findByUserIdAndActiveTrueOrderByCreatedAtDesc(1L);
    }

    @Test
    void shouldGetAccountOwnedByCurrentUser() {

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        AccountResponse response =
                accountService.getAccount(10L);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.name())
                .isEqualTo("HDFC Savings");
        assertThat(response.type())
                .isEqualTo(AccountType.BANK);

        verify(accountRepository)
                .findByIdAndUserId(10L, 1L);
    }

    @Test
    void shouldRejectAccountNotOwnedByCurrentUser() {

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                accountService.getAccount(10L))
                .isInstanceOf(AccountNotFoundException.class)
                .hasMessage("Account not found");
    }

    @Test
    void shouldUpdateAccount() {

        UpdateAccountRequest request =
                new UpdateAccountRequest(
                        "HDFC Salary Account",
                        AccountType.BANK
                );

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        when(accountRepository
                .existsByUserIdAndNameIgnoreCaseAndIdNot(
                        1L,
                        "HDFC Salary Account",
                        10L
                ))
                .thenReturn(false);

        when(accountRepository.saveAndFlush(account))
                .thenReturn(account);

        AccountResponse response =
                accountService.updateAccount(
                        10L,
                        request
                );

        assertThat(response.name())
                .isEqualTo("HDFC Salary Account");

        assertThat(response.type())
                .isEqualTo(AccountType.BANK);

        // opening balance must remain unchanged
        assertThat(response.openingBalance())
                .isEqualByComparingTo("50000.00");

        verify(accountRepository)
                .saveAndFlush(account);
    }

    @Test
    void shouldRejectDuplicateNameWhenUpdatingAccount() {

        UpdateAccountRequest request =
                new UpdateAccountRequest(
                        "ICICI Savings",
                        AccountType.BANK
                );

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        when(accountRepository
                .existsByUserIdAndNameIgnoreCaseAndIdNot(
                        1L,
                        "ICICI Savings",
                        10L
                ))
                .thenReturn(true);

        assertThatThrownBy(() ->
                accountService.updateAccount(
                        10L,
                        request
                ))
                .isInstanceOf(
                        AccountAlreadyExistsException.class
                )
                .hasMessage(
                        "Account with this name already exists"
                );

        verify(accountRepository, never())
                .saveAndFlush(any(Account.class));
    }

    @Test
    void shouldRejectUpdatingAccountNotOwnedByCurrentUser() {

        UpdateAccountRequest request =
                new UpdateAccountRequest(
                        "Updated Account",
                        AccountType.BANK
                );

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                accountService.updateAccount(
                        10L,
                        request
                ))
                .isInstanceOf(AccountNotFoundException.class)
                .hasMessage("Account not found");

        verify(accountRepository, never())
                .saveAndFlush(any(Account.class));
    }

    @Test
    void shouldDeactivateAccount() {

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        when(accountRepository.save(account))
                .thenReturn(account);

        accountService.deactivateAccount(10L);

        assertThat(account.isActive()).isFalse();

        verify(accountRepository)
                .save(account);
    }

    @Test
    void shouldRejectDeactivatingAccountNotOwnedByCurrentUser() {

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                accountService.deactivateAccount(10L))
                .isInstanceOf(AccountNotFoundException.class)
                .hasMessage("Account not found");

        verify(accountRepository, never())
                .save(any(Account.class));
    }

    @ParameterizedTest
    @CsvSource({"uq_accounts_user_name,23505,true", "other_unique,23505,false", "uq_accounts_user_name,23503,false",
            "uq_accounts_user_name,23514,false", "uq_accounts_user_name,22003,false", ",23505,false"})
    void translatesOnlyDomainUniqueViolationOnCreate(String name, String state, boolean duplicate) {
        DataIntegrityViolationException failure = new DataIntegrityViolationException("write failed",
                new RuntimeException(new ConstraintViolationException("constraint", new SQLException("database", state), "insert", name)));
        when(accountRepository.saveAndFlush(any())).thenThrow(failure);
        if (duplicate) {
            assertThatThrownBy(() -> accountService.createAccount(new CreateAccountRequest("Race", AccountType.BANK, BigDecimal.ZERO))).isInstanceOf(AccountAlreadyExistsException.class).hasMessage("Account with this name already exists").hasCause(failure);
        } else {
            assertThatThrownBy(() -> accountService.createAccount(new CreateAccountRequest("Race", AccountType.BANK, BigDecimal.ZERO))).isSameAs(failure);
        }
    }

    @Test
    void translatesUniqueViolationOnRenameAndRethrowsMissingMetadata() {
        when(accountRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(account));
        DataIntegrityViolationException failure = new DataIntegrityViolationException("write failed",
                new ConstraintViolationException("constraint", new SQLException("database", "23505"), "update", "uq_accounts_user_name"));
        when(accountRepository.saveAndFlush(any())).thenThrow(failure);
        assertThatThrownBy(() -> accountService.updateAccount(10L, new UpdateAccountRequest("Race", AccountType.BANK))).isInstanceOf(AccountAlreadyExistsException.class).hasMessage("Account with this name already exists").hasCause(failure);
        DataIntegrityViolationException unknown = new DataIntegrityViolationException("unknown integrity failure");
        doThrow(unknown).when(accountRepository).saveAndFlush(any());
        assertThatThrownBy(() -> accountService.updateAccount(10L, new UpdateAccountRequest("Race", AccountType.BANK))).isSameAs(unknown);
    }
}
