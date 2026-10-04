package com.deepak.cointrailapi.analytics.dto;

import com.deepak.cointrailapi.analytics.AnalyticsDetails.*;
import com.deepak.cointrailapi.analytics.AnalyticsRange;

public record SummaryResponse(AnalyticsRange range, Totals totals) {
    public static SummaryResponse from(Summary details) {
        return new SummaryResponse(details.range(), details.totals());
    }
}
