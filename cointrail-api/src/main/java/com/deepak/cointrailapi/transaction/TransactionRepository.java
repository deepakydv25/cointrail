package com.deepak.cointrailapi.transaction;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long>, JpaSpecificationExecutor<Transaction> {

    @Query("""
            select sum(case when t.type = com.deepak.cointrailapi.transaction.TransactionType.INCOME
                            then t.amount else -t.amount end)
            from Transaction t join t.account a
            where t.user.id = :userId and a.user.id = :userId and a.active = true
            """)
    BigDecimal sumActiveAccountNetFlow(@Param("userId") Long userId);

    @Query("""
            select t.type as type, sum(t.amount) as totalAmount from Transaction t
            where t.user.id = :userId and t.transactionDate >= :from and t.transactionDate < :to
            group by t.type
            """)
    List<TransactionTypeTotal> sumByTypeForPeriod(@Param("userId") Long userId,
            @Param("from") LocalDate from, @Param("to") LocalDate to);

    @EntityGraph(attributePaths = {"account", "category"})
    List<Transaction> findByUserIdOrderByTransactionDateDescCreatedAtDescIdDesc(Long userId, Pageable pageable);

    Optional<Transaction> findByIdAndUserId(Long id, Long userId);

    @Query("""
            select t.category.id as categoryId, sum(t.amount) as spentAmount
            from Transaction t
            where t.user.id = :userId
              and t.type = com.deepak.cointrailapi.transaction.TransactionType.EXPENSE
              and t.category.id in :categoryIds
              and t.transactionDate >= :from
              and t.transactionDate < :to
            group by t.category.id
            """)
    List<CategoryExpenseTotal> sumExpensesByCategory(
            @Param("userId") Long userId,
            @Param("categoryIds") List<Long> categoryIds,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
