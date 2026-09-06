package com.deepak.cointrailapi.service;

import com.deepak.cointrailapi.dto.CreateExpenseRequest;
import com.deepak.cointrailapi.dto.ExpenseResponse;
import com.deepak.cointrailapi.dto.UpdateExpenseResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ExpenseService {

    ExpenseResponse createExpense(CreateExpenseRequest request);

    Page<ExpenseResponse> getAllExpenses(Pageable pageable);

    ExpenseResponse getExpenseById(Long id);

    ExpenseResponse updateExpense(Long id, UpdateExpenseResponse request);

    void deleteExpense(Long id);
}
