package com.deepak.cointrailapi.service;

import com.deepak.cointrailapi.dto.CreateExpenseRequest;
import com.deepak.cointrailapi.dto.ExpenseResponse;
import com.deepak.cointrailapi.dto.UpdateExpenseResponse;
import com.deepak.cointrailapi.entity.Expense;
import com.deepak.cointrailapi.entity.User;
import com.deepak.cointrailapi.enums.ExpenseCategory;
import com.deepak.cointrailapi.exception.ExpenseNotFoundException;
import com.deepak.cointrailapi.repository.ExpenseRepository;
import com.deepak.cointrailapi.specification.ExpenseSpecification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExpenseServiceImpl implements ExpenseService {

    private static final Logger log = LoggerFactory.getLogger(ExpenseServiceImpl.class);

    private ExpenseRepository expenseRepository;


    public ExpenseServiceImpl(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    @Override
    @Transactional
    public ExpenseResponse createExpense(CreateExpenseRequest request) {

        log.info("Creating expense: category={}, amount={}, expenseDate={}", request.getCategory(), request.getAmount(), request.getExpenseDate());

        Expense expense = new Expense();

        expense.setAmount(request.getAmount());
        expense.setCategory(request.getCategory());
        expense.setDescription(request.getDescription());
        expense.setExpenseDate(request.getExpenseDate());

        LocalDateTime now = LocalDateTime.now();
        expense.setCreatedAt(now);
        expense.setUpdatedAt(now);

        User currentUser = getCurrentUser();
        expense.setUser(currentUser);

        Expense savedExpense = expenseRepository.save(expense);

        log.info("Expense created successfully with id={}", savedExpense.getId());

        // TEMPORARY - only for testing transaction rollback
        //throw new RuntimeException("Testing transaction rollback");

        return mapToResponse(savedExpense);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ExpenseResponse> getAllExpenses(ExpenseCategory category, Pageable pageable) {

        User currentUser = getCurrentUser();

        log.debug("Fetching expenses: category={}, page={}, size={}, sort={}", category, pageable.getPageNumber(), pageable.getPageSize(), pageable.getSort());

        Specification<Expense> specification = ExpenseSpecification.belongsToUser(currentUser.getId());

        if (category != null) {
            specification = specification.and(
                    ExpenseSpecification.hasCategory(category)
            );
        }

        Page<Expense> expenses = expenseRepository.findAll(specification, pageable);

        log.debug("Fetched {} expenses, totalElements={}", expenses.getNumberOfElements(), expenses.getTotalElements());

        return expenses.map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(Long id) {

        log.debug("Fetching expense with id={}", id);

        User currentUser = getCurrentUser();

        Expense expense = expenseRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> {
                    log.info("Expense not found with id={}", id);
                    return new ExpenseNotFoundException("Expense not found with id: "+id);
                });
        return mapToResponse(expense);
    }

    @Override
    @Transactional
    public ExpenseResponse updateExpense(Long id, UpdateExpenseResponse request) {

        User currentUser = getCurrentUser();

        log.info("Updating expense with id={} for userId={}", id, currentUser.getId());

        Expense expense = expenseRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> {
                    log.warn("Cannot update expense. Expense not found with id={}", id);

                    return new ExpenseNotFoundException("Expense not found with id: "+id);
                });

        expense.setAmount(request.getAmount());
        expense.setCategory(request.getCategory());
        expense.setDescription(request.getDescription());
        expense.setExpenseDate(request.getExpenseDate());

        expense.setUpdatedAt(LocalDateTime.now());

        Expense updatedExpense = expenseRepository.save(expense);

        log.info("Expense updated successfully with id={}", updatedExpense.getId());

        return mapToResponse(updatedExpense);
    }

    @Override
    @Transactional
    public void deleteExpense(Long id) {

        User currentUser = getCurrentUser();

        log.info("Deleting expense with id={} for userId={}", id, currentUser.getId());

        Expense expense = expenseRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> {
                    log.warn("Cannot delete expense. Expense not found with id={}", id);

                    return new  ExpenseNotFoundException("Expense not found with id: "+id);
                });

        expenseRepository.delete(expense);

        log.info("Expense deleted successfully with id={}", id);
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

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return (User) principal;
    }
}
