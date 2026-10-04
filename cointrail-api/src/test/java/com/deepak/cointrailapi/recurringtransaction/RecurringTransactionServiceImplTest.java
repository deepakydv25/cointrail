package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.account.Account;
import com.deepak.cointrailapi.category.Category;
import com.deepak.cointrailapi.common.exception.*;
import com.deepak.cointrailapi.recurringtransaction.dto.*;
import com.deepak.cointrailapi.transaction.TransactionType;
import com.deepak.cointrailapi.user.User;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.time.*;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecurringTransactionServiceImplTest {
    @Mock RecurringTransactionRepository repository;
    @Mock RecurringTransactionOccurrenceRepository occurrences;
    @Mock RecurringTransactionResources resources;
    private final Clock clock = Clock.fixed(Instant.parse("2024-03-01T00:30:00Z"), ZoneId.of("UTC"));
    private RecurringTransactionServiceImpl service;
    private User user; private Account account; private Category category; private RecurringTransaction r;
    @BeforeEach void setup() {
        service = new RecurringTransactionServiceImpl(repository, occurrences, resources, new RecurrenceCalculator(), clock);
        user = new User(); user.setId(1L);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, java.util.List.of()));
        account = new Account(); account.setId(2L); account.setName("Bank");
        category = new Category(); category.setId(3L); category.setName("Rent");
        r = new RecurringTransaction(); r.setId(4L); r.setUser(user); r.setAccount(account); r.setCategory(category);
        r.setType(TransactionType.EXPENSE); r.setAmount(new BigDecimal("10.00")); r.setDescription("Rent");
        r.setFrequency(RecurrenceFrequency.MONTHLY); r.setStartDate(LocalDate.of(2024,1,31));
        r.setNextDueDate(LocalDate.of(2024,2,29)); r.setStatus(RecurringTransactionStatus.ACTIVE);
        r.setCreatedAt(LocalDateTime.of(2024,1,1,0,0));
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }
    private void owned() { when(repository.findOwnedForUpdate(4L, 1L)).thenReturn(Optional.of(r)); }
    private void eligible() { when(resources.resolve(1L, 2L, 3L, TransactionType.EXPENSE)).thenReturn(new RecurringTransactionResources.Eligible(account,category)); }
    private UpdateRecurringTransactionRequest update(String amount, String description) {
        return new UpdateRecurringTransactionRequest(2L,3L,new BigDecimal(amount),description);
    }
    @Test void shouldCreateTodayWithScopedTimestampsAndNoPosting() {
        eligible(); when(repository.save(any())).thenAnswer(call -> { RecurringTransaction v=call.getArgument(0);v.setId(4L);return v; });
        var result=service.createRecurringTransaction(new CreateRecurringTransactionRequest(2L,3L,TransactionType.EXPENSE,
            new BigDecimal("10.00"),"Rent",RecurrenceFrequency.MONTHLY,LocalDate.of(2024,3,1),null));
        assertThat(result.status()).isEqualTo(RecurringTransactionStatus.ACTIVE);
        assertThat(result.nextDueDate()).isEqualTo(LocalDate.of(2024,3,1));
        assertThat(result.createdAt()).isEqualTo(LocalDateTime.now(clock)); verifyNoInteractions(occurrences);
    }
    @ParameterizedTest @ValueSource(strings={"0", "-1", "0.001", "1.001", "100000000000000000.00"})
    void shouldRejectInvalidAmounts(String amount) {
        assertThatThrownBy(() -> service.createRecurringTransaction(new CreateRecurringTransactionRequest(2L,3L,TransactionType.EXPENSE,
            new BigDecimal(amount),null,RecurrenceFrequency.DAILY,LocalDate.now(clock),null)))
            .isInstanceOf(InvalidRecurringTransactionException.class);
        verifyNoInteractions(resources);
    }
    @Test void shouldRejectPastDateAndInvalidEndDirectly() {
        for (var request : java.util.List.of(
            new CreateRecurringTransactionRequest(2L,3L,TransactionType.EXPENSE,new BigDecimal("1"),null,RecurrenceFrequency.DAILY,LocalDate.now(clock).minusDays(1),null),
            new CreateRecurringTransactionRequest(2L,3L,TransactionType.EXPENSE,new BigDecimal("1"),null,RecurrenceFrequency.DAILY,LocalDate.now(clock),LocalDate.now(clock).minusDays(1)))) {
            assertThatThrownBy(() -> service.createRecurringTransaction(request)).isInstanceOf(InvalidRecurringTransactionException.class);
        }
    }
    @Test void shouldRejectFinancialBacklogEditsAndMixedRepairAtomically() {
        owned(); r.setStatus(RecurringTransactionStatus.BLOCKED); r.setBlockedReason("Account is inactive");
        for (var request : java.util.List.of(update("11","Rent"),update("10","changed"),
            new UpdateRecurringTransactionRequest(9L,3L,new BigDecimal("11"),"Rent")))
            assertThatThrownBy(() -> service.updateRecurringTransaction(4L,request)).isInstanceOf(RecurringTransactionConflictException.class);
        assertThat(r.getAccount().getId()).isEqualTo(2L); assertThat(r.getAmount()).isEqualByComparingTo("10");
        verifyNoInteractions(resources); verify(repository,never()).save(any());
    }
    @Test void shouldAllowBlockedAssociationRepairWithNumericallyUnchangedAmount() {
        owned(); r.setStatus(RecurringTransactionStatus.BLOCKED);r.setBlockedReason("Account is inactive");
        Account repaired=new Account();repaired.setId(9L);repaired.setName("Repaired");
        when(resources.resolve(1L,9L,3L,TransactionType.EXPENSE)).thenReturn(new RecurringTransactionResources.Eligible(repaired,category));
        when(repository.save(r)).thenReturn(r);
        var result=service.updateRecurringTransaction(4L,new UpdateRecurringTransactionRequest(9L,3L,new BigDecimal("10.0"),"Rent"));
        assertThat(result.accountId()).isEqualTo(9L);assertThat(result.status()).isEqualTo(RecurringTransactionStatus.BLOCKED);
        assertThat(result.nextDueDate()).isEqualTo(LocalDate.of(2024,2,29));assertThat(result.blockedReason()).isNotNull();
    }
    @Test void shouldRejectActiveAssociationChangesWithBacklog() {
        owned();assertThatThrownBy(() -> service.updateRecurringTransaction(4L,new UpdateRecurringTransactionRequest(9L,3L,new BigDecimal("10"),"Rent")))
            .isInstanceOf(RecurringTransactionConflictException.class);
    }
    @Test void shouldAllowFutureEditsAndPreserveAnchorAndCreatedAt() {
        owned();eligible();r.setNextDueDate(LocalDate.of(2024,3,31));when(repository.save(r)).thenReturn(r);
        var result=service.updateRecurringTransaction(4L,update("12","changed"));
        assertThat(result.amount()).isEqualByComparingTo("12");assertThat(result.startDate()).isEqualTo(LocalDate.of(2024,1,31));
        assertThat(result.createdAt()).isEqualTo(LocalDateTime.of(2024,1,1,0,0));verifyNoInteractions(occurrences);
    }
    @Test void shouldNotTreatDeletedProcessedOccurrenceAsBacklog() {
        owned();eligible();when(occurrences.existsByRecurringTransactionIdAndScheduledDate(4L,LocalDate.of(2024,2,29))).thenReturn(true);
        when(repository.save(r)).thenReturn(r);assertThat(service.updateRecurringTransaction(4L,update("12","Rent")).amount()).isEqualByComparingTo("12");
    }
    @Test void shouldPauseAndResumeWithoutCatchingUpOrDriftingAnchor() {
        owned();eligible();when(repository.save(r)).thenReturn(r);
        assertThat(service.pauseRecurringTransaction(4L).status()).isEqualTo(RecurringTransactionStatus.PAUSED);
        assertThat(service.resumeRecurringTransaction(4L).nextDueDate()).isEqualTo(LocalDate.of(2024,3,31));
        assertThat(r.getStartDate()).isEqualTo(LocalDate.of(2024,1,31));verifyNoInteractions(occurrences);
    }
    @Test void shouldRejectPausedFinancialEditWhenResumeWouldIncludeToday() {
        owned();r.setStatus(RecurringTransactionStatus.PAUSED);r.setFrequency(RecurrenceFrequency.DAILY);
        assertThatThrownBy(() -> service.updateRecurringTransaction(4L,update("12","Rent")))
            .isInstanceOf(RecurringTransactionConflictException.class);
        verify(occurrences).existsByRecurringTransactionIdAndScheduledDate(4L,LocalDate.now(clock));
        verifyNoInteractions(resources);
    }
    @Test void shouldCompleteExpiredPausedScheduleAndRejectTerminalEdits() {
        owned();r.setStatus(RecurringTransactionStatus.PAUSED);r.setEndDate(LocalDate.of(2024,2,29));when(repository.save(r)).thenReturn(r);
        assertThat(service.resumeRecurringTransaction(4L).status()).isEqualTo(RecurringTransactionStatus.COMPLETED);
        assertThat(r.getNextDueDate()).isNull();
        assertThatThrownBy(() -> service.updateRecurringTransaction(4L,update("12","Rent"))).isInstanceOf(RecurringTransactionConflictException.class);
        assertThatThrownBy(() -> service.pauseRecurringTransaction(4L)).isInstanceOf(RecurringTransactionConflictException.class);
    }
    @Test void shouldKeepBlockedRecoveryWorkerOwnedAndCancelRetainedRow() {
        owned();r.setStatus(RecurringTransactionStatus.BLOCKED);r.setBlockedReason("Account is inactive");
        assertThatThrownBy(() -> service.resumeRecurringTransaction(4L)).isInstanceOf(RecurringTransactionConflictException.class);
        service.cancelRecurringTransaction(4L);service.cancelRecurringTransaction(4L);
        assertThat(r.getStatus()).isEqualTo(RecurringTransactionStatus.CANCELLED);assertThat(r.getNextDueDate()).isNull();
        assertThat(r.getBlockedReason()).isNull();verify(repository,never()).delete(any(RecurringTransaction.class));
    }
    @Test void shouldHideMissingForeignRowsBeforeConflictsAndRequireUserPrincipal() {
        assertThatThrownBy(() -> service.updateRecurringTransaction(4L,update("12","Rent"))).isInstanceOf(RecurringTransactionNotFoundException.class);
        SecurityContextHolder.clearContext(); assertThatThrownBy(() -> service.getRecurringTransaction(4L)).isInstanceOf(AccessDeniedException.class);
    }
}
