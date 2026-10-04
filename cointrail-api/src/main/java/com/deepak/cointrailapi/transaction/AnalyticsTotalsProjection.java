package com.deepak.cointrailapi.transaction;

import java.math.BigDecimal;

public interface AnalyticsTotalsProjection {
    BigDecimal getIncome();
    BigDecimal getExpense();
    long getTransactionCount();
}
