package com.deepak.cointrailapi.transaction;

import com.deepak.cointrailapi.account.AccountType;

public interface AnalyticsAccountProjection extends AnalyticsTotalsProjection {
    Long getAccountId();
    String getAccountName();
    AccountType getAccountType();
    boolean getActive();
}
