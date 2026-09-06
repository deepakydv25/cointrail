package com.deepak.cointrailapi.service;

import com.deepak.cointrailapi.dto.CreateExpenseRequest;
import com.deepak.cointrailapi.dto.ExpenseResponse;
import com.deepak.cointrailapi.dto.UpdateExpenseResponse;
import com.deepak.cointrailapi.enums.ExpenseCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ExpenseService {

    ExpenseResponse createExpense(CreateExpenseRequest request);

    Page<ExpenseResponse> getAllExpenses(ExpenseCategory category, Pageable pageable);

    ExpenseResponse getExpenseById(Long id);

    ExpenseResponse updateExpense(Long id, UpdateExpenseResponse request);

    void deleteExpense(Long id);
}
