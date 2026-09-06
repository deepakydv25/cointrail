package com.deepak.cointrailapi.service;

import com.deepak.cointrailapi.dto.CreateExpenseRequest;
import com.deepak.cointrailapi.dto.ExpenseResponse;
import com.deepak.cointrailapi.dto.UpdateExpenseResponse;
import com.deepak.cointrailapi.entity.Expense;
import com.deepak.cointrailapi.enums.ExpenseCategory;
import com.deepak.cointrailapi.exception.ExpenseNotFoundException;
import com.deepak.cointrailapi.repository.ExpenseRepository;
import com.deepak.cointrailapi.specification.ExpenseSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExpenseServiceImpl implements ExpenseService {

    private ExpenseRepository expenseRepository;

    public ExpenseServiceImpl(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    @Override
    @Transactional
    public ExpenseResponse createExpense(CreateExpenseRequest request) {

        Expense expense = new Expense();

        expense.setAmount(request.getAmount());
        expense.setCategory(request.getCategory());
        expense.setDescription(request.getDescription());
        expense.setExpenseDate(request.getExpenseDate());

        LocalDateTime now = LocalDateTime.now();
        expense.setCreatedAt(now);
        expense.setUpdatedAt(now);

        Expense savedExpense = expenseRepository.save(expense);

        // TEMPORARY - only for testing transaction rollback
        //throw new RuntimeException("Testing transaction rollback");

        return mapToResponse(savedExpense);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ExpenseResponse> getAllExpenses(ExpenseCategory category, Pageable pageable) {

        Specification<Expense> specification = Specification.allOf();

        if (category != null) {
            specification = specification.and(
                    ExpenseSpecification.hasCategory(category)
            );
        }

        Page<Expense> expenses = expenseRepository.findAll(specification, pageable);

        return expenses.map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ExpenseNotFoundException("Expense not found with id: "+id));
        return mapToResponse(expense);
    }

    @Override
    @Transactional
    public ExpenseResponse updateExpense(Long id, UpdateExpenseResponse request) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ExpenseNotFoundException("Expense not found with id: "+id));

        expense.setAmount(request.getAmount());
        expense.setCategory(request.getCategory());
        expense.setDescription(request.getDescription());
        expense.setExpenseDate(request.getExpenseDate());

        expense.setUpdatedAt(LocalDateTime.now());

        Expense updatedExpense = expenseRepository.save(expense);

        return mapToResponse(updatedExpense);
    }

    @Override
    @Transactional
    public void deleteExpense(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new  ExpenseNotFoundException("Expense not found with id: "+id));

        expenseRepository.delete(expense);
    }

    private ExpenseResponse mapToResponse(Expense expense) {

        ExpenseResponse response = new ExpenseResponse();

        response.setId(expense.getId());
        response.setAmount(expense.getAmount());
        response.setCategory(expense.getCategory());
        response.setDescription(expense.getDescription());
        response.setExpenseDate(expense.getExpenseDate());
        response.setCreatedAt(expense.getCreatedAt());
        response.setUpdatedAt(expense.getUpdatedAt());

        return response;
    }
}
