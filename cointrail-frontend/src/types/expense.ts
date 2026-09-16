export interface Expense {
    id: number;
    amount: number;
    category: ExpenseCategory;
    description: string;
    expenseDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExpenseRequest {
    amount: number;
    category: ExpenseCategory;
    description: string;
    expenseDate: string;
}

export interface UpdateExpenseRequest {
    amount: number;
    category: ExpenseCategory;
    description: string;
    expenseDate:string;
}

export interface ExpenseSummary {
    totalAmount: number;
    totalExpenses: number;
    categoryBreakdown: Partial<Record<ExpenseCategory, number>>;
}

export type ExpenseCategory = 
    | 'FOOD'
    | 'TRAVEL'
    | 'SHOPPING'
    | 'ENTERTAINMENT'
    | 'BILLS'
    | 'HEALTH'
    | 'EDUCATION'
    | 'OTHER';