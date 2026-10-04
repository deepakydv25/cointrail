package com.deepak.cointrailapi.analytics.dto;

import com.deepak.cointrailapi.analytics.AnalyticsDetails.*;
import com.deepak.cointrailapi.analytics.AnalyticsRange;
import java.util.List;

public record CategoriesResponse(AnalyticsRange range, Totals totals, List<CategoryGroup> items) {
    public static CategoriesResponse from(Categories details) {
        return new CategoriesResponse(details.range(), details.totals(), details.items());
    }
}
