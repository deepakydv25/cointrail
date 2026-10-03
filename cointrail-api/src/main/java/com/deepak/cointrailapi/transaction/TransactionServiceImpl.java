package com.deepak.cointrailapi.transaction;

import com.deepak.cointrailapi.account.Account;
import com.deepak.cointrailapi.account.AccountRepository;
import com.deepak.cointrailapi.category.Category;
import com.deepak.cointrailapi.category.CategoryRepository;
import com.deepak.cointrailapi.common.exception.AccountNotFoundException;
import com.deepak.cointrailapi.common.exception.CategoryNotFoundException;
import com.deepak.cointrailapi.common.exception.InvalidTransactionException;
import com.deepak.cointrailapi.common.exception.TransactionNotFoundException;
import com.deepak.cointrailapi.transaction.dto.CreateTransactionRequest;
import com.deepak.cointrailapi.transaction.dto.TransactionResponse;
import com.deepak.cointrailapi.transaction.dto.UpdateTransactionRequest;
import com.deepak.cointrailapi.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

    public TransactionServiceImpl(TransactionRepository transactionRepository,
                                  AccountRepository accountRepository,
                                  CategoryRepository categoryRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional
    public TransactionResponse createTransaction(CreateTransactionRequest request) {

        User user = getCurrentUser();

        Account account = accountRepository.findByIdAndUserId(request.getAccountId(), user.getId())
                .orElseThrow(() -> new AccountNotFoundException("Account not found"));


        if(!account.isActive()) {
            throw new InvalidTransactionException("Cannot create transaction for inactive account");
        }

        Category category = categoryRepository.findByIdAndActiveTrue(request.getCategoryId())
                .orElseThrow(() -> new CategoryNotFoundException("Category not found"));

        validateCategoryAccess(category, user);

        validateCategoryType(category, request.getType());

        Transaction transaction = new Transaction();

        transaction.setUser(user);
        transaction.setAccount(account);
        transaction.setCategory(category);
        transaction.setType(request.getType());
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(request.getTransactionDate());

        LocalDateTime now = LocalDateTime.now();

        transaction.setCreatedAt(now);
        transaction.setUpdatedAt(now);

        Transaction saved =  transactionRepository.save(transaction);

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransaction(Long id) {

        User user = getCurrentUser();

        Transaction transaction = transactionRepository
                .findByIdAndUserId(id, user.getId())
                .orElseThrow(() ->
                        new TransactionNotFoundException("Transaction not found"));

        return toResponse(transaction);
    }

    @Override
    @Transactional
    public TransactionResponse updateTransaction(Long id, UpdateTransactionRequest request) {

        User user = getCurrentUser();

        Transaction transaction = transactionRepository
                .findByIdAndUserId(id, user.getId())
                .orElseThrow(() ->
                        new TransactionNotFoundException("Transaction not found"));

        Account account = accountRepository
                .findByIdAndUserId(request.getAccountId(), user.getId())
                .orElseThrow(() ->
                        new AccountNotFoundException("Account not found"));

        if (!account.isActive()) {
            throw new InvalidTransactionException("Cannot update transaction with inactive account");
        }

        Category category = categoryRepository
                .findByIdAndActiveTrue(request.getCategoryId())
                .orElseThrow(() ->
                        new CategoryNotFoundException("Category not found"));

        validateCategoryAccess(category, user);
        validateCategoryType(category, request.getType());

        transaction.setAccount(account);
        transaction.setCategory(category);
        transaction.setType(request.getType());
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setUpdatedAt(LocalDateTime.now());

        Transaction updated = transactionRepository.save(transaction);

        return toResponse(updated);
    }

    @Override
    @Transactional
    public void deleteTransaction(Long id) {

        User user = getCurrentUser();

        Transaction transaction = transactionRepository
                .findByIdAndUserId(id, user.getId())
                .orElseThrow(() ->
                        new TransactionNotFoundException("Transaction not found"));

        transactionRepository.delete(transaction);
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

    private void validateCategoryAccess(Category category, User user) {
        if (!category.isSystem()) {
            if (category.getUser() == null || !category.getUser().getId().equals(user.getId())) {
                throw new CategoryNotFoundException("Category not found");
            }
        }
    }

    private void validateCategoryType(Category category, TransactionType transactionType) {
        if (!category.getType().name().equals(transactionType.name())) {
            throw new InvalidTransactionException("Category type does not match transaction type");
        }
    }


    private TransactionResponse toResponse(Transaction transaction) {

        TransactionResponse response = new TransactionResponse();

        response.setId(transaction.getId());
        response.setType(transaction.getType());
        response.setAmount(transaction.getAmount());
        response.setDescription(transaction.getDescription());
        response.setTransactionDate(transaction.getTransactionDate());
        response.setAccountId(transaction.getAccount().getId());
        response.setAccountName(transaction.getAccount().getName());
        response.setCategoryId(transaction.getCategory().getId());
        response.setCategoryName(transaction.getCategory().getName());
        response.setCreatedAt(transaction.getCreatedAt());
        response.setUpdatedAt(transaction.getUpdatedAt());

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactions(
            TransactionType type,
            Long accountId,
            Long categoryId,
            LocalDate from,
            LocalDate to,
            Pageable pageable) {

        User user = getCurrentUser();

        if (from != null && to != null && from.isAfter(to)) {
            throw new InvalidTransactionException(
                    "'from' date cannot be after 'to' date"
            );
        }

        Specification<Transaction> specification =
                TransactionSpecification.hasUserId(user.getId())
                        .and(TransactionSpecification.hasType(type))
                        .and(TransactionSpecification.hasAccountId(accountId))
                        .and(TransactionSpecification.hasCategoryId(categoryId))
                        .and(TransactionSpecification.dateFrom(from))
                        .and(TransactionSpecification.dateTo(to));

        return transactionRepository
                .findAll(specification, pageable)
                .map(this::toResponse);
    }
}
