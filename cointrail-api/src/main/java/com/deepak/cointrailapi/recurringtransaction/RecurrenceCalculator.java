package com.deepak.cointrailapi.recurringtransaction;

import org.springframework.stereotype.Component;
import java.time.*;
import java.time.temporal.ChronoUnit;

@Component
public class RecurrenceCalculator {
    public static final LocalDate MAX_DATE = LocalDate.of(9999, 12, 31);

    /** Recompute from the original anchor, never from a previously clamped day. */
    public LocalDate onOrAfter(LocalDate anchor, RecurrenceFrequency frequency, LocalDate target, LocalDate end) {
        if (target.isAfter(MAX_DATE)) return null;
        if (!target.isAfter(anchor)) return withinEnd(anchor, end);
        long step = switch (frequency) {
            case DAILY -> ChronoUnit.DAYS.between(anchor, target);
            case WEEKLY -> ChronoUnit.DAYS.between(anchor, target) / 7;
            case MONTHLY -> ChronoUnit.MONTHS.between(YearMonth.from(anchor), YearMonth.from(target));
            case YEARLY -> target.getYear() - anchor.getYear();
        };
        LocalDate date = atStep(anchor, frequency, step);
        if (date != null && date.isBefore(target)) date = atStep(anchor, frequency, step + 1);
        return withinEnd(date, end);
    }

    public LocalDate next(LocalDate anchor, RecurrenceFrequency frequency, LocalDate current, LocalDate end) {
        if (!current.isBefore(MAX_DATE)) return null;
        return onOrAfter(anchor, frequency, current.plusDays(1), end);
    }

    private LocalDate atStep(LocalDate anchor, RecurrenceFrequency frequency, long step) {
        try {
            LocalDate result = switch (frequency) {
                case DAILY -> anchor.plusDays(step);
                case WEEKLY -> anchor.plusWeeks(step);
                case MONTHLY -> anchor.plusMonths(step);
                case YEARLY -> anchor.plusYears(step);
            };
            return result.isAfter(MAX_DATE) ? null : result;
        } catch (DateTimeException | ArithmeticException exception) {
            return null;
        }
    }

    private LocalDate withinEnd(LocalDate date, LocalDate end) {
        return date == null || (end != null && date.isAfter(end)) ? null : date;
    }
}
