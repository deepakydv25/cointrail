package com.deepak.cointrailapi.analytics.dto;

import com.deepak.cointrailapi.analytics.AnalyticsDetails.*;
import com.deepak.cointrailapi.analytics.AnalyticsRange;
import com.deepak.cointrailapi.analytics.AnalyticsGrouping;
import java.util.List;

public record TrendsResponse(AnalyticsRange range, AnalyticsGrouping grouping, Totals totals, List<Bucket> items) {
    public static TrendsResponse from(Trends details) {
        return new TrendsResponse(details.range(), details.grouping(), details.totals(), details.items());
    }
}
