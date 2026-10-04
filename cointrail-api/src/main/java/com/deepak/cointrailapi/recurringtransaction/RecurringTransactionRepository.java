package com.deepak.cointrailapi.recurringtransaction;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.*;

public interface RecurringTransactionRepository extends JpaRepository<RecurringTransaction, Long>, JpaSpecificationExecutor<RecurringTransaction> {
    @EntityGraph(attributePaths = {"account", "category"})
    Optional<RecurringTransaction> findByIdAndUserId(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RecurringTransaction r where r.id = :id and r.user.id = :userId")
    Optional<RecurringTransaction> findOwnedForUpdate(@Param("id") Long id, @Param("userId") Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RecurringTransaction r where r.id = :id")
    Optional<RecurringTransaction> findForGeneration(@Param("id") Long id);

    @Override
    @EntityGraph(attributePaths = {"account", "category"})
    Page<RecurringTransaction> findAll(Specification<RecurringTransaction> specification, Pageable pageable);

    interface Candidate {
        Long getId();
        LocalDate getNextDueDate();
    }

    // Keyset continuation prevents permanently blocked early rows from starving later work.
    @Query("""
        select r.id as id, r.nextDueDate as nextDueDate from RecurringTransaction r
        where r.status in (com.deepak.cointrailapi.recurringtransaction.RecurringTransactionStatus.ACTIVE,
                           com.deepak.cointrailapi.recurringtransaction.RecurringTransactionStatus.BLOCKED)
          and r.nextDueDate <= :today
          and (r.nextDueDate > :afterDate or (r.nextDueDate = :afterDate and r.id > :afterId))
        order by r.nextDueDate, r.id
        """)
    List<Candidate> findCandidates(@Param("today") LocalDate today, @Param("afterDate") LocalDate afterDate,
                                   @Param("afterId") Long afterId, Pageable pageable);
}
