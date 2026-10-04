package com.deepak.cointrailapi.transaction;

import java.math.BigDecimal;

public interface TransactionTypeTotal {
    TransactionType getType();
    BigDecimal getTotalAmount();
}
