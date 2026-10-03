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

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @PostMapping
    public ResponseEntity<BudgetResponse> createBudget(@Valid @RequestBody CreateBudgetRequest request) {
        BudgetDetails budget = budgetService.createBudget(
                request.categoryId(), request.year(), request.month(), request.amount());
        return ResponseEntity.status(HttpStatus.CREATED).body(BudgetResponse.from(budget));
    }

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

    @GetMapping("/{id}")
    public ResponseEntity<BudgetResponse> getBudget(@PathVariable Long id) {
        return ResponseEntity.ok(BudgetResponse.from(budgetService.getBudget(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BudgetResponse> updateBudget(
            @PathVariable Long id, @Valid @RequestBody UpdateBudgetRequest request) {
        return ResponseEntity.ok(BudgetResponse.from(budgetService.updateBudget(id, request.amount())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudget(@PathVariable Long id) {
        budgetService.deleteBudget(id);
        return ResponseEntity.noContent().build();
    }
}
