package com.deepak.cointrailapi.account;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

    @Query("select sum(a.openingBalance) from Account a where a.user.id = :userId and a.active = true")
    BigDecimal sumActiveOpeningBalances(@Param("userId") Long userId);

    Optional<Account> findByIdAndUserId(Long id, Long userId);

    List<Account> findByUserIdAndActiveTrueOrderByCreatedAtDesc(Long userId);

    boolean existsByUserIdAndNameIgnoreCase(Long userId, String name);

    boolean existsByUserIdAndNameIgnoreCaseAndIdNot(Long userId, String name, Long id);
}
