package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.analytics.dto.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final AnalyticsService service;
    public AnalyticsController(AnalyticsService service) { this.service = service; }

    @GetMapping("/summary")
    public SummaryResponse summary(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return SummaryResponse.from(service.summary(from, to));
    }
    @GetMapping("/categories")
    public CategoriesResponse categories(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return CategoriesResponse.from(service.categories(from, to));
    }
    @GetMapping("/accounts")
    public AccountsResponse accounts(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return AccountsResponse.from(service.accounts(from, to));
    }
    @GetMapping("/trends")
    public TrendsResponse trends(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam AnalyticsGrouping grouping) {
        return TrendsResponse.from(service.trends(from, to, grouping));
    }
    @GetMapping("/comparison")
    public ComparisonResponse comparison(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate compareFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate compareTo) {
        return ComparisonResponse.from(service.comparison(from, to, compareFrom, compareTo));
    }
}
