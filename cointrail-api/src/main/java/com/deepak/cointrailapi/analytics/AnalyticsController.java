package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.analytics.dto.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;

@Tag(name = "Analytics")
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final AnalyticsService service;
    public AnalyticsController(AnalyticsService service) { this.service = service; }

    @Operation(summary = "Get historical financial totals", description = "Required inclusive from/to, years 1-9999, from <= to; to must be before from.plusYears(5), preserving LocalDate anniversary/leap-day clamping. Future ranges return persisted actuals only. Income, expense, signed net cash flow and count; empty data yields zero totals. Read-only READ_COMMITTED, no synchronized snapshot.")
    @GetMapping("/summary")
    public SummaryResponse summary(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return SummaryResponse.from(service.summary(from, to));
    }
    @Operation(summary = "Get category breakdown", description = "Required inclusive range, to < from.plusYears(5); years 1-9999 and from <= to. Complete stable-ID groups ordered by ID with current metadata and inactive historical references. No shares or percentages. Empty data returns an empty array.")
    @GetMapping("/categories")
    public CategoriesResponse categories(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return CategoriesResponse.from(service.categories(from, to));
    }
    @Operation(summary = "Get account breakdown", description = "Required inclusive range, to < from.plusYears(5); years 1-9999 and from <= to. Complete stable-ID groups ordered by ID with current metadata and inactive historical references. Transaction totals, not account balances; no shares. Empty data returns an empty array.")
    @GetMapping("/accounts")
    public AccountsResponse accounts(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return AccountsResponse.from(service.accounts(from, to));
    }
    @Operation(summary = "Get financial trends", description = "Required inclusive from/to and grouping, years 1-9999 and from <= to. DAILY maximum 366 inclusive days; WEEKLY to < from.plusYears(2); MONTHLY to < from.plusYears(5), using calendar anniversaries with leap-day clamping. Monday calendar weeks and calendar months; clipped edge buckets, ascending order and zero-filled gaps. Persisted actuals only.")
    @GetMapping("/trends")
    public TrendsResponse trends(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam AnalyticsGrouping grouping) {
        return TrendsResponse.from(service.trends(from, to, grouping));
    }
    @Operation(summary = "Compare explicit periods", description = "Required from/to and compareFrom/compareTo, each inclusive, years 1-9999, start <= end and end < start.plusYears(5) with calendar leap-day clamping. Overlap and unequal lengths allowed. Raw totals and signed current-minus-comparison deltas; no inferred period, percentages or normalization. Read-only READ_COMMITTED.")
    @GetMapping("/comparison")
    public ComparisonResponse comparison(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate compareFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate compareTo) {
        return ComparisonResponse.from(service.comparison(from, to, compareFrom, compareTo));
    }
}
