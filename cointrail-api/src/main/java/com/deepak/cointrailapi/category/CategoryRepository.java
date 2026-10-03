package com.deepak.cointrailapi.category;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findByIdAndActiveTrue(Long id);

    List<Category> findBySystemTrueAndActiveTrueOrderByNameAsc();

    List<Category> findByUserIdAndActiveTrueOrderByNameAsc(Long userId);

    Optional<Category> findByIdAndUserIdAndActiveTrue(Long id, Long userId);

    boolean existsByNameIgnoreCaseAndTypeAndSystemTrue(String name, CategoryType type);

    boolean existsByNameIgnoreCaseAndTypeAndUserId(String name, CategoryType type, Long userId);

    boolean existsByNameIgnoreCaseAndTypeAndUserIdAndIdNot(String name, CategoryType type, Long userId, Long id);
}
