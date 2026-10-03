package com.deepak.cointrailapi.budget;

import java.math.BigDecimal;
import java.util.List;

public interface BudgetService {

    BudgetDetails createBudget(Long categoryId, Integer year, Integer month, BigDecimal amount);

    List<BudgetDetails> getBudgets(Integer year, Integer month);

    BudgetDetails getBudget(Long id);

    BudgetDetails updateBudget(Long id, BigDecimal amount);

    void deleteBudget(Long id);
}
