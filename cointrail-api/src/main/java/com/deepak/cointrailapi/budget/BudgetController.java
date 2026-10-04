package com.deepak.cointrailapi.budget;

import com.deepak.cointrailapi.budget.dto.BudgetResponse;
import com.deepak.cointrailapi.budget.dto.CreateBudgetRequest;
import com.deepak.cointrailapi.budget.dto.UpdateBudgetRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@Tag(name = "Budgets")
@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @Operation(summary = "Create a monthly budget", description = "Requires an accessible active EXPENSE category. One definition per owner/category/year/month; amount uses up to 17 integer and 2 fractional digits.")
    @PostMapping
    public ResponseEntity<BudgetResponse> createBudget(@Valid @RequestBody CreateBudgetRequest request) {
        BudgetDetails budget = budgetService.createBudget(
                request.categoryId(), request.year(), request.month(), request.amount());
        return ResponseEntity.status(HttpStatus.CREATED).body(BudgetResponse.from(budget));
    }

    @Operation(summary = "List monthly budgets", description = "Explicit year and month required. Actual EXPENSE spending is derived from transactions; inactive historical references are retained.")
    @GetMapping
    public ResponseEntity<List<BudgetResponse>> getBudgets(
            @RequestParam
            @Min(value = 1, message = "Year must be between 1 and 9999")
            @Max(value = 9999, message = "Year must be between 1 and 9999")
            Integer year,
            @RequestParam
            @Min(value = 1, message = "Month must be between 1 and 12")
            @Max(value = 12, message = "Month must be between 1 and 12")
            Integer month) {
        return ResponseEntity.ok(budgetService.getBudgets(year, month)
                .stream()
                .map(BudgetResponse::from)
                .toList());
    }

    @Operation(summary = "Get a budget", description = "Owned monthly definition and derived spending, signed remaining amount, and overBudget (spent greater than budget amount).")
    @GetMapping("/{id}")
    public ResponseEntity<BudgetResponse> getBudget(@PathVariable Long id) {
        return ResponseEntity.ok(BudgetResponse.from(budgetService.getBudget(id)));
    }

    @Operation(summary = "Update a budget amount", description = "Only amount changes; category/year/month remain fixed.")
    @PutMapping("/{id}")
    public ResponseEntity<BudgetResponse> updateBudget(
            @PathVariable Long id, @Valid @RequestBody UpdateBudgetRequest request) {
        return ResponseEntity.ok(BudgetResponse.from(budgetService.updateBudget(id, request.amount())));
    }

    @Operation(summary = "Delete a budget", description = "Removes the definition, preserving transactions.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudget(@PathVariable Long id) {
        budgetService.deleteBudget(id);
        return ResponseEntity.noContent().build();
    }
}
