package com.deepak.cointrailapi.analytics.dto;

import com.deepak.cointrailapi.analytics.AnalyticsDetails.*;
import com.deepak.cointrailapi.analytics.AnalyticsRange;
import java.util.List;

public record AccountsResponse(AnalyticsRange range, Totals totals, List<AccountGroup> items) {
    public static AccountsResponse from(Accounts details) {
        return new AccountsResponse(details.range(), details.totals(), details.items());
    }
}
