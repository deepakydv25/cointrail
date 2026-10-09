export interface BudgetPeriod { year: string; month: string }
export interface BudgetResponse extends BudgetPeriod {
    id: string; categoryId: string; categoryName: string; amount: string;
    spentAmount: string; remainingAmount: string; overBudget: boolean;
    createdAt: string; updatedAt: string;
}
export interface CreateBudgetRequest extends BudgetPeriod { categoryId: string; amount: string }
export interface UpdateBudgetRequest { amount: string }
