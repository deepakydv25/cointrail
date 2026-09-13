package com.deepak.cointrailapi.specification;

import com.deepak.cointrailapi.entity.Expense;
import com.deepak.cointrailapi.enums.ExpenseCategory;
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
