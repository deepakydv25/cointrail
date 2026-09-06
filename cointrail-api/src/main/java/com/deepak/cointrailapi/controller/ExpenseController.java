package com.deepak.cointrailapi.controller;

import com.deepak.cointrailapi.dto.CreateExpenseRequest;
import com.deepak.cointrailapi.dto.ExpenseResponse;
import com.deepak.cointrailapi.dto.UpdateExpenseResponse;
import com.deepak.cointrailapi.service.ExpenseService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @GetMapping("/home")
    public String expenseHome() {
        return "Welcome to CoinTrail API!";
    }

    @PostMapping("/create")
    public ResponseEntity<ExpenseResponse> createExpense(@Valid @RequestBody CreateExpenseRequest request) {
        ExpenseResponse response = expenseService.createExpense(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping()
    public ResponseEntity<List<ExpenseResponse>> getAllExpenses() {
        List<ExpenseResponse> expenses = expenseService.getAllExpenses();
        return ResponseEntity.ok(expenses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseResponse> getExpenseById(@PathVariable @Positive Long id) {
        ExpenseResponse response = expenseService.getExpenseById(id);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseResponse> updateExpense(@PathVariable @Positive Long id, @Valid @RequestBody UpdateExpenseResponse request) {
        ExpenseResponse response = expenseService.updateExpense(id, request);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ExpenseResponse> deleteExpense(@PathVariable @Positive Long id) {
        expenseService.deleteExpense(id);

        return ResponseEntity.noContent().build();
    }
}
