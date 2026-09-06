package com.deepak.cointrailapi.dto;

import com.deepak.cointrailapi.enums.ExpenseCategory;

import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateExpenseRequest {
    private BigDecimal amount;
    private ExpenseCategory category;
    private String description;
    private LocalDate expenseDate;

    public CreateExpenseRequest() {

    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public ExpenseCategory getCategory() {
        return category;
    }

    public void setCategory(ExpenseCategory category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getExpenseDate() {
        return expenseDate;
    }

    public void setExpenseDate(LocalDate expenseDate) {
        this.expenseDate = expenseDate;
    }
}
