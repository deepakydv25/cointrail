package com.deepak.cointrailapi.transaction;

import com.deepak.cointrailapi.account.Account;
import com.deepak.cointrailapi.account.AccountRepository;
import com.deepak.cointrailapi.account.AccountType;
import com.deepak.cointrailapi.category.Category;
import com.deepak.cointrailapi.category.CategoryRepository;
import com.deepak.cointrailapi.category.CategoryType;
import com.deepak.cointrailapi.common.exception.AccountNotFoundException;
import com.deepak.cointrailapi.common.exception.CategoryNotFoundException;
import com.deepak.cointrailapi.common.exception.InvalidTransactionException;
import com.deepak.cointrailapi.common.exception.TransactionNotFoundException;
import com.deepak.cointrailapi.transaction.dto.CreateTransactionRequest;
import com.deepak.cointrailapi.transaction.dto.TransactionResponse;
import com.deepak.cointrailapi.transaction.dto.UpdateTransactionRequest;
import com.deepak.cointrailapi.user.Role;
import com.deepak.cointrailapi.user.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TransactionServiceImplTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private TransactionServiceImpl transactionService;

    private User user;
    private Account account;
    private Category expenseCategory;


    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setRole(Role.USER);

        account = new Account();
        account.setId(10L);
        account.setUser(user);
        account.setName("HDFC Savings");
        account.setType(AccountType.BANK);
        account.setActive(true);

        expenseCategory = new Category();
        expenseCategory.setId(20L);
        expenseCategory.setName("Food");
        expenseCategory.setType(CategoryType.EXPENSE);
        expenseCategory.setSystem(true);
        expenseCategory.setActive(true);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        user.getAuthorities()
                )
        );
    }


    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }


    @Test
    void shouldCreateExpenseTransaction() {

        CreateTransactionRequest request = new CreateTransactionRequest();

        request.setAccountId(10L);
        request.setCategoryId(20L);
        request.setType(TransactionType.EXPENSE);
        request.setAmount(new BigDecimal("500.00"));
        request.setDescription("Dinner");
        request.setTransactionDate(LocalDate.now());

        when(accountRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(account));

        when(categoryRepository.findByIdAndActiveTrue(20L)).thenReturn(Optional.of(expenseCategory));

        when(transactionRepository.save(any(Transaction.class)))
                .thenAnswer(invocation -> {
                    Transaction transaction =
                            invocation.getArgument(0);

                    transaction.setId(100L);

                    return transaction;
                });

        TransactionResponse response = transactionService.createTransaction(request);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getType()).isEqualTo(TransactionType.EXPENSE);

        assertThat(response.getAmount()).isEqualByComparingTo("500.00");

        assertThat(response.getAccountId()).isEqualTo(10L);
        assertThat(response.getAccountName()).isEqualTo("HDFC Savings");

        assertThat(response.getCategoryId()).isEqualTo(20L);
        assertThat(response.getCategoryName()).isEqualTo("Food");

        verify(transactionRepository).save(any(Transaction.class));
    }


    @Test
    void shouldRejectAccountNotOwnedByCurrentUser() {

        CreateTransactionRequest request = createExpenseRequest();

        when(accountRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                transactionService.createTransaction(request))
                .isInstanceOf(AccountNotFoundException.class);

        verify(transactionRepository, never()).save(any());
    }


    @Test
    void shouldRejectInactiveAccount() {

        account.setActive(false);

        CreateTransactionRequest request = createExpenseRequest();

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        assertThatThrownBy(() ->
                transactionService.createTransaction(request))
                .isInstanceOf(InvalidTransactionException.class)
                .hasMessage("Cannot create transaction for inactive account");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void shouldRejectCategoryTypeMismatch() {

        expenseCategory.setType(CategoryType.INCOME);

        CreateTransactionRequest request = createExpenseRequest();

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        when(categoryRepository.findByIdAndActiveTrue(20L))
                .thenReturn(Optional.of(expenseCategory));

        assertThatThrownBy(() ->
                transactionService.createTransaction(request))
                .isInstanceOf(InvalidTransactionException.class)
                .hasMessage(
                        "Category type does not match transaction type"
                );

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void shouldRejectCustomCategoryOwnedByAnotherUser() {

        User anotherUser = new User();
        anotherUser.setId(2L);

        expenseCategory.setSystem(false);
        expenseCategory.setUser(anotherUser);

        CreateTransactionRequest request = createExpenseRequest();

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        when(categoryRepository.findByIdAndActiveTrue(20L))
                .thenReturn(Optional.of(expenseCategory));

        assertThatThrownBy(() ->
                transactionService.createTransaction(request))
                .isInstanceOf(CategoryNotFoundException.class);

        verify(transactionRepository, never())
                .save(any());
    }

    @Test
    void shouldRejectUnavailableCategory() {

        CreateTransactionRequest request = createExpenseRequest();

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        when(categoryRepository.findByIdAndActiveTrue(20L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                transactionService.createTransaction(request))
                .isInstanceOf(CategoryNotFoundException.class);

        verify(transactionRepository, never())
                .save(any());
    }

    @Test
    void shouldGetTransactionForCurrentUser() {

        Transaction transaction = createExistingTransaction();

        when(transactionRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(transaction));

        TransactionResponse response = transactionService.getTransaction(100L);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getType())
                .isEqualTo(TransactionType.EXPENSE);
        assertThat(response.getAmount())
                .isEqualByComparingTo("500.00");
        assertThat(response.getAccountId()).isEqualTo(10L);
        assertThat(response.getCategoryId()).isEqualTo(20L);

        verify(transactionRepository).findByIdAndUserId(100L, 1L);
    }

    @Test
    void shouldRejectGettingTransactionNotOwnedByCurrentUser() {

        when(transactionRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                transactionService.getTransaction(100L))
                .isInstanceOf(TransactionNotFoundException.class)
                .hasMessage("Transaction not found");
    }

    @Test
    void shouldUpdateTransaction() {

        Transaction transaction = createExistingTransaction();

        Category incomeCategory = new Category();
        incomeCategory.setId(30L);
        incomeCategory.setName("Salary");
        incomeCategory.setType(CategoryType.INCOME);
        incomeCategory.setSystem(true);
        incomeCategory.setActive(true);

        UpdateTransactionRequest request =
                new UpdateTransactionRequest();

        request.setAccountId(10L);
        request.setCategoryId(30L);
        request.setType(TransactionType.INCOME);
        request.setAmount(new BigDecimal("80000.00"));
        request.setDescription("October salary");
        request.setTransactionDate(LocalDate.now());

        when(transactionRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(transaction));

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        when(categoryRepository.findByIdAndActiveTrue(30L))
                .thenReturn(Optional.of(incomeCategory));

        when(transactionRepository.save(any(Transaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TransactionResponse response = transactionService.updateTransaction(100L, request);

        assertThat(response.getType())
                .isEqualTo(TransactionType.INCOME);

        assertThat(response.getAmount())
                .isEqualByComparingTo("80000.00");

        assertThat(response.getDescription())
                .isEqualTo("October salary");

        assertThat(response.getCategoryId()).isEqualTo(30L);
        assertThat(response.getCategoryName()).isEqualTo("Salary");

        // Ownership must remain unchanged
        assertThat(transaction.getUser().getId()).isEqualTo(1L);

        verify(transactionRepository).save(transaction);
    }

    @Test
    void shouldRejectUpdatingTransactionNotOwnedByCurrentUser() {

        UpdateTransactionRequest request = createUpdateRequest();

        when(transactionRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                transactionService.updateTransaction(100L, request))
                .isInstanceOf(TransactionNotFoundException.class)
                .hasMessage("Transaction not found");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void shouldRejectUpdatingTransactionWithAccountNotOwnedByCurrentUser() {

        Transaction transaction = createExistingTransaction();

        UpdateTransactionRequest request = createUpdateRequest();

        when(transactionRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(transaction));

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                transactionService.updateTransaction(100L, request))
                .isInstanceOf(AccountNotFoundException.class)
                .hasMessage("Account not found");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void shouldRejectUpdatingTransactionWithInactiveAccount() {

        Transaction transaction = createExistingTransaction();

        account.setActive(false);

        UpdateTransactionRequest request = createUpdateRequest();

        when(transactionRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(transaction));

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        assertThatThrownBy(() ->
                transactionService.updateTransaction(100L, request))
                .isInstanceOf(InvalidTransactionException.class)
                .hasMessage("Cannot update transaction with inactive account");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void shouldRejectUpdatingTransactionWithUnavailableCategory() {

        Transaction transaction = createExistingTransaction();

        UpdateTransactionRequest request = createUpdateRequest();

        when(transactionRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(transaction));

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        when(categoryRepository.findByIdAndActiveTrue(20L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                transactionService.updateTransaction(100L, request))
                .isInstanceOf(CategoryNotFoundException.class)
                .hasMessage("Category not found");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void shouldRejectUpdatingTransactionWithCategoryTypeMismatch() {

        Transaction transaction = createExistingTransaction();

        Category incomeCategory = new Category();
        incomeCategory.setId(30L);
        incomeCategory.setName("Salary");
        incomeCategory.setType(CategoryType.INCOME);
        incomeCategory.setSystem(true);
        incomeCategory.setActive(true);

        UpdateTransactionRequest request = createUpdateRequest();

        // Request remains EXPENSE but category is INCOME
        request.setCategoryId(30L);

        when(transactionRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(transaction));

        when(accountRepository.findByIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(account));

        when(categoryRepository.findByIdAndActiveTrue(30L))
                .thenReturn(Optional.of(incomeCategory));

        assertThatThrownBy(() ->
                transactionService.updateTransaction(100L, request))
                .isInstanceOf(InvalidTransactionException.class)
                .hasMessage(
                        "Category type does not match transaction type"
                );

        verify(transactionRepository, never())
                .save(any());
    }

    @Test
    void shouldDeleteTransactionForCurrentUser() {

        Transaction transaction = createExistingTransaction();

        when(transactionRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(transaction));

        transactionService.deleteTransaction(100L);

        verify(transactionRepository).delete(transaction);
    }

    @Test
    void shouldRejectDeletingTransactionNotOwnedByCurrentUser() {

        when(transactionRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                transactionService.deleteTransaction(100L))
                .isInstanceOf(TransactionNotFoundException.class)
                .hasMessage("Transaction not found");

        verify(transactionRepository, never()).delete(any(Transaction.class));
    }

    @Test
    void shouldGetTransactionsForCurrentUser() {

        Transaction transaction = createExistingTransaction();

        Pageable pageable = PageRequest.of(0, 20);

        Page<Transaction> transactionPage =
                new PageImpl<>(
                        List.of(transaction),
                        pageable,
                        1
                );

        when(transactionRepository.findAll(
                any(Specification.class),
                eq(pageable)
        )).thenReturn(transactionPage);

        Page<TransactionResponse> result =
                transactionService.getTransactions(
                        TransactionType.EXPENSE,
                        10L,
                        20L,
                        null,
                        null,
                        pageable
                );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);

        TransactionResponse response =
                result.getContent().getFirst();

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getType())
                .isEqualTo(TransactionType.EXPENSE);
        assertThat(response.getAccountId()).isEqualTo(10L);
        assertThat(response.getCategoryId()).isEqualTo(20L);

        verify(transactionRepository)
                .findAll(
                        any(Specification.class),
                        eq(pageable)
                );
    }

    @Test
    void shouldRejectInvalidTransactionDateRange() {

        Pageable pageable = PageRequest.of(0, 20);

        LocalDate from = LocalDate.of(2026, 10, 31);
        LocalDate to = LocalDate.of(2026, 10, 1);

        assertThatThrownBy(() ->
                transactionService.getTransactions(
                        null,
                        null,
                        null,
                        from,
                        to,
                        pageable
                ))
                .isInstanceOf(InvalidTransactionException.class)
                .hasMessage(
                        "'from' date cannot be after 'to' date"
                );

        verify(transactionRepository, never())
                .findAll(
                        any(Specification.class),
                        any(Pageable.class)
                );
    }

    private CreateTransactionRequest createExpenseRequest() {

        CreateTransactionRequest request = new CreateTransactionRequest();

        request.setAccountId(10L);
        request.setCategoryId(20L);
        request.setType(TransactionType.EXPENSE);
        request.setAmount(new BigDecimal("500.00"));
        request.setDescription("Test expense");
        request.setTransactionDate(LocalDate.now());

        return request;
    }

    private Transaction createExistingTransaction() {

        Transaction transaction = new Transaction();

        transaction.setId(100L);
        transaction.setUser(user);
        transaction.setAccount(account);
        transaction.setCategory(expenseCategory);
        transaction.setType(TransactionType.EXPENSE);
        transaction.setAmount(new BigDecimal("500.00"));
        transaction.setDescription("Dinner");
        transaction.setTransactionDate(LocalDate.now());
        transaction.setCreatedAt(LocalDateTime.now());
        transaction.setUpdatedAt(LocalDateTime.now());

        return transaction;
    }


    private UpdateTransactionRequest createUpdateRequest() {

        UpdateTransactionRequest request =
                new UpdateTransactionRequest();

        request.setAccountId(10L);
        request.setCategoryId(20L);
        request.setType(TransactionType.EXPENSE);
        request.setAmount(new BigDecimal("1000.00"));
        request.setDescription("Updated expense");
        request.setTransactionDate(LocalDate.now());

        return request;
    }
}
