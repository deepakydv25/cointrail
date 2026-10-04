package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.common.exception.InvalidAnalyticsException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.*;

class AnalyticsRangeTest {
    @ParameterizedTest @CsvSource({
        "2020-01-01,2024-12-31,1827", "2024-02-29,2029-02-27,1826",
        "2000-02-29,2005-02-27,1826", "2096-02-29,2101-02-27,1825",
        "2023-03-15,2028-03-14,1827", "0001-01-01,0001-01-01,1",
        "9998-12-31,9999-12-31,366", "9999-12-31,9999-12-31,1"})
    void acceptsCalendarRangeThroughLastInclusiveDate(String from,String to,long days) {
        var range=AnalyticsRange.fiveYears(LocalDate.parse(from),LocalDate.parse(to));
        assertThat(range.dayCount()).isEqualTo(days);
        assertThat(range.exclusiveTo()).isEqualTo(LocalDate.parse(to).plusDays(1));
    }
    @ParameterizedTest @ValueSource(strings={"2020-01-01","2024-02-29","2000-02-29","2096-02-29","2023-03-15"})
    void rejectsFiveYearAnniversary(String start) {
        LocalDate from=LocalDate.parse(start);
        assertThatThrownBy(()->AnalyticsRange.fiveYears(from,from.plusYears(5))).isInstanceOf(InvalidAnalyticsException.class);
    }
    @Test void dispatchesTrendLimitsWithoutUniversalDayCap() {
        LocalDate from=LocalDate.of(2023,1,1),to=LocalDate.of(2024,12,31);
        assertThat(AnalyticsRange.trends(from,to,AnalyticsGrouping.WEEKLY).dayCount()).isEqualTo(731);
        assertThatThrownBy(()->AnalyticsRange.trends(from,to,AnalyticsGrouping.DAILY)).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(()->AnalyticsRange.trends(from,to.plusDays(1),AnalyticsGrouping.WEEKLY)).isInstanceOf(InvalidAnalyticsException.class);
        assertThat(AnalyticsRange.trends(LocalDate.of(2020,1,1),to,AnalyticsGrouping.MONTHLY).dayCount()).isEqualTo(1827);
        assertThatThrownBy(()->AnalyticsRange.trends(LocalDate.of(2020,1,1),to.plusDays(1),AnalyticsGrouping.MONTHLY)).isInstanceOf(InvalidAnalyticsException.class);
    }
    @Test void dailyBoundaryIsInclusive() {
        LocalDate from=LocalDate.of(2024,1,1);
        assertThat(AnalyticsRange.trends(from,from.plusDays(365),AnalyticsGrouping.DAILY).dayCount()).isEqualTo(366);
        assertThatThrownBy(()->AnalyticsRange.trends(from,from.plusDays(366),AnalyticsGrouping.DAILY)).isInstanceOf(InvalidAnalyticsException.class);
    }
    @Test void weeklyLeapClampAndPublicUpperBoundaryArePreserved() {
        LocalDate leap=LocalDate.of(2024,2,29);
        assertThat(AnalyticsRange.trends(leap,LocalDate.of(2026,2,27),AnalyticsGrouping.WEEKLY)).isNotNull();
        assertThatThrownBy(()->AnalyticsRange.trends(leap,LocalDate.of(2026,2,28),AnalyticsGrouping.WEEKLY)).isInstanceOf(InvalidAnalyticsException.class);
        assertThat(AnalyticsRange.trends(LocalDate.of(9998,12,31),LocalDate.of(9999,12,31),AnalyticsGrouping.WEEKLY).exclusiveTo()).isEqualTo(LocalDate.of(10000,1,1));
    }
    @ParameterizedTest @EnumSource(AnalyticsGrouping.class)
    void sameDayIsValidForEveryGrouping(AnalyticsGrouping grouping) {
        assertThat(AnalyticsRange.trends(LocalDate.of(1,1,1),LocalDate.of(1,1,1),grouping).dayCount()).isEqualTo(1);
    }
    @Test void rejectsRequiredBoundsReversalUnsupportedYearsAndGrouping() {
        LocalDate day=LocalDate.of(2024,1,1);
        for(LocalDate bad:new LocalDate[]{null,LocalDate.of(0,12,31),LocalDate.of(10000,1,1)}) {
            assertThatThrownBy(()->AnalyticsRange.fiveYears(bad,day)).isInstanceOf(InvalidAnalyticsException.class);
            assertThatThrownBy(()->AnalyticsRange.fiveYears(day,bad)).isInstanceOf(InvalidAnalyticsException.class);
        }
        assertThatThrownBy(()->AnalyticsRange.fiveYears(day,day.minusDays(1))).isInstanceOf(InvalidAnalyticsException.class);
        assertThatThrownBy(()->AnalyticsRange.trends(day,day,null)).isInstanceOf(InvalidAnalyticsException.class);
    }
}
