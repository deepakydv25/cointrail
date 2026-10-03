package com.deepak.cointrailapi.budget;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    @EntityGraph(attributePaths = "category")
    Optional<Budget> findByIdAndUserId(Long id, Long userId);

    @EntityGraph(attributePaths = "category")
    List<Budget> findByUserIdAndYearAndMonthOrderByCategoryIdAscIdAsc(
            Long userId, Integer year, Integer month);

    boolean existsByUserIdAndCategoryIdAndYearAndMonth(
            Long userId, Long categoryId, Integer year, Integer month);
}
