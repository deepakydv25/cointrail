package com.deepak.cointrailapi.transaction;

import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public final class TransactionSpecification {

    private TransactionSpecification() {
    }

    public static Specification<Transaction> hasUserId(Long userId) {
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(
                        root.get("user").get("id"),
                        userId
                );
    }

    public static Specification<Transaction> hasType(
            TransactionType type) {

        return (root, query, criteriaBuilder) -> {

            if (type == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(
                    root.get("type"),
                    type
            );
        };
    }

    public static Specification<Transaction> hasAccountId(
            Long accountId) {

        return (root, query, criteriaBuilder) -> {

            if (accountId == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(
                    root.get("account").get("id"),
                    accountId
            );
        };
    }

    public static Specification<Transaction> hasCategoryId(
            Long categoryId) {

        return (root, query, criteriaBuilder) -> {

            if (categoryId == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(
                    root.get("category").get("id"),
                    categoryId
            );
        };
    }

    public static Specification<Transaction> dateFrom(LocalDate from) {

        return (root, query, criteriaBuilder) -> {

            if (from == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.greaterThanOrEqualTo(
                    root.get("transactionDate"),
                    from
            );
        };
    }

    public static Specification<Transaction> dateTo(
            LocalDate to) {

        return (root, query, criteriaBuilder) -> {

            if (to == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.lessThanOrEqualTo(
                    root.get("transactionDate"),
                    to
            );
        };
    }
}
