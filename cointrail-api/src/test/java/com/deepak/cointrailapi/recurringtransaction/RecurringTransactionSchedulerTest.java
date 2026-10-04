package com.deepak.cointrailapi.recurringtransaction;

import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecurringTransactionSchedulerTest {
    private final Clock clock=Clock.fixed(Instant.parse("2024-03-01T00:00:00Z"),ZoneOffset.UTC);
    @Test void shouldContinuePastBlockedAndFailedCandidatesThenWrap() {
        var repository=mock(RecurringTransactionRepository.class);var worker=mock(RecurringTransactionGenerationWorker.class);
        var settings=new RecurringTransactionSchedulingConfig.Settings("UTC",true,Duration.ofMinutes(1),1,2);
        var first=mock(RecurringTransactionRepository.Candidate.class);when(first.getId()).thenReturn(1L);when(first.getNextDueDate()).thenReturn(LocalDate.of(2024,1,1));
        var second=mock(RecurringTransactionRepository.Candidate.class);when(second.getId()).thenReturn(2L);when(second.getNextDueDate()).thenReturn(LocalDate.of(2024,2,1));
        when(repository.findCandidates(any(),any(),any(),any())).thenReturn(List.of(first),List.of(second),List.of(),List.of(first));
        when(worker.process(1L)).thenThrow(new IllegalStateException("failure"));
        var scheduler=new RecurringTransactionScheduler(repository,worker,settings,clock);
        scheduler.runCycle();scheduler.runCycle();scheduler.runCycle();verify(worker).process(2L);verify(worker,times(2)).process(1L);
        verify(repository).findCandidates(eq(LocalDate.now(clock)),eq(LocalDate.of(2024,1,1)),eq(1L),any());
    }
    @Test void shouldNotRunWhenDisabledAndRejectInvalidConfiguration() {
        var repository=mock(RecurringTransactionRepository.class);var worker=mock(RecurringTransactionGenerationWorker.class);
        new RecurringTransactionScheduler(repository,worker,new RecurringTransactionSchedulingConfig.Settings("UTC",false,Duration.ofMinutes(1),1,2),clock).runCycle();
        verifyNoInteractions(repository,worker);
        assertThatThrownBy(() -> new RecurringTransactionSchedulingConfig.Settings("bad-zone",true,Duration.ofMinutes(1),1,2)).isInstanceOf(DateTimeException.class);
        assertThatThrownBy(() -> new RecurringTransactionSchedulingConfig.Settings("UTC",true,Duration.ZERO,1,2)).isInstanceOf(IllegalArgumentException.class);
    }
}
