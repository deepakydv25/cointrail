package com.deepak.cointrailapi.expense;

import com.deepak.cointrailapi.expense.dto.CreateExpenseRequest;
import com.deepak.cointrailapi.expense.dto.ExpenseResponse;
import com.deepak.cointrailapi.expense.dto.ExpenseSummaryResponse;
import com.deepak.cointrailapi.expense.dto.UpdateExpenseResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ExpenseService {

    ExpenseResponse createExpense(CreateExpenseRequest request);

    Page<ExpenseResponse> getAllExpenses(ExpenseCategory category, Pageable pageable);

    ExpenseResponse getExpenseById(Long id);

    ExpenseResponse updateExpense(Long id, UpdateExpenseResponse request);

    void deleteExpense(Long id);

    ExpenseSummaryResponse getExpenseSummary();
}
