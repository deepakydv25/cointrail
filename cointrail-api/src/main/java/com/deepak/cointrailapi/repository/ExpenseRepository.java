package com.deepak.cointrailapi.repository;

import com.deepak.cointrailapi.entity.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long>, JpaSpecificationExecutor<Expense> {

    Optional<Expense> findByIdAndUserId(Long id, Long userId);

    Page<Expense> findAllByUserId(Long userId, Pageable pageable);

    @Query("""
            SELECT COALESCE(SUM(e.amount), 0)
            FROM Expense e
            WHERE e.user.id = :userId
    """)
    BigDecimal getTotalAmountByUserId(@Param("userId") Long userId);

    long countByUserId(Long userId);

    @Query("""
            SELECT e.category, SUM(e.amount)
            FROM Expense e
            WHERE e.user.id = :userId
            GROUP BY e.category
    """)
    List<Object[]> getCategoryBreakdownByUserId(@Param("userId") Long userId);
}