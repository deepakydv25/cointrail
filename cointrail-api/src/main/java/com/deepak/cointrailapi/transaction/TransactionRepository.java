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
            select sum(case when t.type = com.deepak.cointrailapi.transaction.TransactionType.INCOME then t.amount else 0 end) as income,
                   sum(case when t.type = com.deepak.cointrailapi.transaction.TransactionType.EXPENSE then t.amount else 0 end) as expense,
                   count(t) as transactionCount
            from Transaction t
            where t.user.id = :userId and t.transactionDate >= :from and t.transactionDate < :to
            """)
    AnalyticsTotalsProjection analyticsTotals(@Param("userId") Long userId,
            @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("""
            select c.id as categoryId, c.name as categoryName, c.type as categoryType,
                   c.system as system, c.active as active, sum(case when t.type = com.deepak.cointrailapi.transaction.TransactionType.INCOME then t.amount else 0 end) as income,
                   sum(case when t.type = com.deepak.cointrailapi.transaction.TransactionType.EXPENSE then t.amount else 0 end) as expense,
                   count(t) as transactionCount
            from Transaction t join t.category c
            where t.user.id = :userId and t.transactionDate >= :from and t.transactionDate < :to
            group by c.id, c.name, c.type, c.system, c.active
            order by c.id
            """)
    List<AnalyticsCategoryProjection> analyticsCategories(@Param("userId") Long userId,
            @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("""
            select a.id as accountId, a.name as accountName, a.type as accountType,
                   a.active as active, sum(case when t.type = com.deepak.cointrailapi.transaction.TransactionType.INCOME then t.amount else 0 end) as income,
                   sum(case when t.type = com.deepak.cointrailapi.transaction.TransactionType.EXPENSE then t.amount else 0 end) as expense,
                   count(t) as transactionCount
            from Transaction t join t.account a
            where t.user.id = :userId and t.transactionDate >= :from and t.transactionDate < :to
            group by a.id, a.name, a.type, a.active
            order by a.id
            """)
    List<AnalyticsAccountProjection> analyticsAccounts(@Param("userId") Long userId,
            @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query(value = """
            select cast(date_trunc(:unit, cast(t.transaction_date as timestamp)) as date) as bucketStart,
                   sum(case when t.type = 'INCOME' then t.amount else 0 end) as income,
                   sum(case when t.type = 'EXPENSE' then t.amount else 0 end) as expense,
                   count(*) as transactionCount
            from transactions t
            where t.user_id = :userId and t.transaction_date >= :from and t.transaction_date < :to
            group by 1 order by 1
            """, nativeQuery = true)
    List<AnalyticsBucketProjection> analyticsBuckets(@Param("userId") Long userId,
            @Param("from") LocalDate from, @Param("to") LocalDate to, @Param("unit") String unit);

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
