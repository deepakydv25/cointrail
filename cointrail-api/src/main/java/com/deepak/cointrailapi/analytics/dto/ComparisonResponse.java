package com.deepak.cointrailapi.analytics.dto;

import com.deepak.cointrailapi.analytics.AnalyticsDetails.*;

public record ComparisonResponse(Summary current, Summary baseline, Totals delta) {
    public static ComparisonResponse from(Comparison details) {
        return new ComparisonResponse(details.current(), details.baseline(), details.delta());
    }
}
