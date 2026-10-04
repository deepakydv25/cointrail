package com.deepak.cointrailapi.dashboard;

import com.deepak.cointrailapi.dashboard.dto.DashboardResponse;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService service;
    public DashboardController(DashboardService service) { this.service = service; }

    @GetMapping
    public DashboardResponse getDashboard(
            @RequestParam @Min(1) @Max(9999) Integer year,
            @RequestParam @Min(1) @Max(12) Integer month) {
        return DashboardResponse.from(service.getDashboard(year, month));
    }
}
