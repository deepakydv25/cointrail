package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.account.*;
import com.deepak.cointrailapi.category.*;
import com.deepak.cointrailapi.common.exception.*;
import com.deepak.cointrailapi.transaction.TransactionType;
import org.springframework.stereotype.Component;

/** Shared eligibility checks for owner API writes and persisted-template generation. */
@Component
public class RecurringTransactionResources {
    private final AccountRepository accounts;
    private final CategoryRepository categories;

    public RecurringTransactionResources(AccountRepository accounts, CategoryRepository categories) {
        this.accounts = accounts;
        this.categories = categories;
    }

    public record Eligible(Account account, Category category) {}

    public Eligible resolve(Long userId, Long accountId, Long categoryId, TransactionType type) {
        if (accountId == null || accountId <= 0 || categoryId == null || categoryId <= 0)
            throw new InvalidRecurringTransactionException("Account and category IDs must be positive");
        Account account = accounts.findByIdAndUserId(accountId, userId)
            .orElseThrow(() -> new AccountNotFoundException("Account not found"));
        if (!account.isActive()) throw new InvalidRecurringTransactionException("Account is inactive");
        Category category = categories.findByIdAndActiveTrue(categoryId)
            .orElseThrow(() -> new CategoryNotFoundException("Category not found"));
        if (!category.isSystem() && (category.getUser() == null || !userId.equals(category.getUser().getId())))
            throw new CategoryNotFoundException("Category not found");
        if (type == null || !category.getType().name().equals(type.name()))
            throw new InvalidRecurringTransactionException("Category type does not match transaction type");
        return new Eligible(account, category);
    }
}
