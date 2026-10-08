package com.deepak.cointrailapi.account.dto;

import com.deepak.cointrailapi.account.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateAccountRequest(
        @NotBlank(message = "Account name is required")
        @Size(max = 100, message = "Account name must not exceed 100 characters")
        String name,

        @NotNull(message = "Account type is required")
        AccountType type,

        @NotNull(message = "Opening balance is required")
        @Digits(integer = 17, fraction = 2,
                message = "Opening balance must have at most 17 integer and 2 fractional digits")
        BigDecimal openingBalance
) {
}
