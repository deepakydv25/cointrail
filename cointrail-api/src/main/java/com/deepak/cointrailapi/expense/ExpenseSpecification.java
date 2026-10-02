package com.deepak.cointrailapi.expense;

import org.springframework.data.jpa.domain.Specification;

public final class ExpenseSpecification {

    private ExpenseSpecification() {}

    public static Specification<Expense> hasCategory(ExpenseCategory category) {
        return (root, query, criteriaBuilder) -> criteriaBuilder
                .equal(root.get("category"), category);
    }

    public static Specification<Expense> belongsToUser(Long userId) {
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(
                        root.get("user").get("id"),
                        userId
                );
    }
}
