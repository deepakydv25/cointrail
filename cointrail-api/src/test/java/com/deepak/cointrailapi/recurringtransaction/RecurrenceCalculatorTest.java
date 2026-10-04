package com.deepak.cointrailapi.recurringtransaction;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.*;

class RecurrenceCalculatorTest {
    private final RecurrenceCalculator calculator = new RecurrenceCalculator();

    @ParameterizedTest
    @CsvSource({
        "2023-01-31,MONTHLY,2023-02-01,2023-02-28", "2023-01-31,MONTHLY,2023-03-01,2023-03-31",
        "2024-01-29,MONTHLY,2024-02-01,2024-02-29", "2023-01-30,MONTHLY,2023-02-01,2023-02-28",
        "2024-02-29,YEARLY,2025-01-01,2025-02-28", "2024-02-29,YEARLY,2028-01-01,2028-02-29",
        "2024-12-31,DAILY,2025-01-01,2025-01-01", "2024-12-31,WEEKLY,2025-01-01,2025-01-07",
        "2024-01-31,MONTHLY,2024-02-29,2024-02-29", "2024-01-31,MONTHLY,2024-03-01,2024-03-31"
    })
    void shouldCalculateFromOriginalAnchor(String start, RecurrenceFrequency frequency, String target, String expected) {
        assertThat(calculator.onOrAfter(LocalDate.parse(start), frequency, LocalDate.parse(target), null))
            .isEqualTo(LocalDate.parse(expected));
    }
    @Test void shouldRespectInclusiveEndAndSupportedDomain() {
        LocalDate anchor = LocalDate.of(2024, 1, 31), end = LocalDate.of(2024, 2, 29);
        assertThat(calculator.next(anchor, RecurrenceFrequency.MONTHLY, anchor, end)).isEqualTo(end);
        assertThat(calculator.next(anchor, RecurrenceFrequency.MONTHLY, end, end)).isNull();
        for (var frequency : RecurrenceFrequency.values()) {
            assertThat(calculator.next(RecurrenceCalculator.MAX_DATE, frequency, RecurrenceCalculator.MAX_DATE, null)).isNull();
            assertThat(calculator.onOrAfter(anchor, frequency, LocalDate.of(10000, 1, 1), null)).isNull();
        }
        assertThat(calculator.onOrAfter(anchor, RecurrenceFrequency.DAILY, anchor.minusDays(1), null)).isEqualTo(anchor);
    }
}
