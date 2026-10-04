package com.deepak.cointrailapi.analytics;

import com.deepak.cointrailapi.analytics.AnalyticsDetails.*;
import java.time.LocalDate;

public interface AnalyticsService {
    Summary summary(LocalDate from, LocalDate to);
    Categories categories(LocalDate from, LocalDate to);
    Accounts accounts(LocalDate from, LocalDate to);
    Trends trends(LocalDate from, LocalDate to, AnalyticsGrouping grouping);
    Comparison comparison(LocalDate from, LocalDate to, LocalDate compareFrom, LocalDate compareTo);
}
