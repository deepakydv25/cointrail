package com.deepak.cointrailapi.account.dto;

import com.deepak.cointrailapi.account.AccountType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AccountResponse(
        Long id,
        String name,
        AccountType type,
        BigDecimal openingBalance,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
