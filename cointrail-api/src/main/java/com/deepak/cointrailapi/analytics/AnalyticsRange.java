package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.common.exception.InvalidAnalyticsException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Validated inclusive public range; internal exclusive bounds may exceed public year 9999. */
public record AnalyticsRange(LocalDate from, LocalDate to, long dayCount) {
    public static AnalyticsRange fiveYears(LocalDate from, LocalDate to) {
        return validate(from, to, 5, false);
    }

    public static AnalyticsRange trends(LocalDate from, LocalDate to, AnalyticsGrouping grouping) {
        if (grouping == null) throw new InvalidAnalyticsException("Grouping is required");
        return switch (grouping) {
            case DAILY -> validate(from, to, 0, true);
            case WEEKLY -> validate(from, to, 2, false);
            case MONTHLY -> validate(from, to, 5, false);
        };
    }

    private static AnalyticsRange validate(LocalDate from, LocalDate to, int years, boolean daily) {
        if (from == null || to == null) throw new InvalidAnalyticsException("From and to dates are required");
        if (from.getYear() < 1 || from.getYear() > 9999 || to.getYear() < 1 || to.getYear() > 9999)
            throw new InvalidAnalyticsException("Dates must be within years 1 to 9999");
        if (from.isAfter(to)) throw new InvalidAnalyticsException("From date must be on or before to date");
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (daily && days > 366) throw new InvalidAnalyticsException("DAILY trends allow at most 366 inclusive days");
        // Anniversary comparison deliberately retains LocalDate leap-day clamping, without public-year clamping.
        if (!daily && !to.isBefore(from.plusYears(years)))
            throw new InvalidAnalyticsException("Range must fit within " + years + " calendar years (exclusive anniversary)");
        return new AnalyticsRange(from, to, days);
    }

    public LocalDate exclusiveTo() { return to.plusDays(1); }
}
