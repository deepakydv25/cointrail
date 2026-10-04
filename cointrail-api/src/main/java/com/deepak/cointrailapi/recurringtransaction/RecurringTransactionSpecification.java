package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.transaction.TransactionType;
import org.springframework.data.jpa.domain.Specification;

public final class RecurringTransactionSpecification {
    private RecurringTransactionSpecification() {}

    public static Specification<RecurringTransaction> ownedAndFiltered(Long userId, RecurringTransactionStatus status,
                                                                      TransactionType type, Long accountId, Long categoryId) {
        return (root, query, cb) -> {
            var predicate = cb.equal(root.get("user").get("id"), userId);
            if (status != null) predicate = cb.and(predicate, cb.equal(root.get("status"), status));
            if (type != null) predicate = cb.and(predicate, cb.equal(root.get("type"), type));
            if (accountId != null) predicate = cb.and(predicate, cb.equal(root.get("account").get("id"), accountId));
            if (categoryId != null) predicate = cb.and(predicate, cb.equal(root.get("category").get("id"), categoryId));
            return predicate;
        };
    }
}
