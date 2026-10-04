package com.deepak.cointrailapi.dashboard;

import com.deepak.cointrailapi.dashboard.dto.DashboardResponse;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Dashboard")
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService service;
    public DashboardController(DashboardService service) { this.service = service; }

    @Operation(summary = "Get the financial dashboard", description = "Explicit selected year/month. Active-account opening balances plus persisted signed ledger actuals; selected-month income/expense/net cash flow; compact budget totals; latest five owned transactions across all dates; up to five ACTIVE/BLOCKED due cursors overdue or through recurring today +30 days, with clock/timezone metadata. No recurrence forecasting. Read-only READ_COMMITTED; sections need not share a synchronized snapshot.")
    @GetMapping
    public DashboardResponse getDashboard(
            @RequestParam @Min(1) @Max(9999) Integer year,
            @RequestParam @Min(1) @Max(12) Integer month) {
        return DashboardResponse.from(service.getDashboard(year, month));
    }
}
