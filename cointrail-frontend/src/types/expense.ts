export interface Expense {
    id: number;
    amount: number;
    category: string;
    description: string;
    expenseDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExpenseRequest {
    amount: number;
    category: string;
    description: string;
    expenseDate: string;
}

export interface UpdateExpenseRequest {
    amount: number;
    category: string;
    description: string;
    expenseDate:string;
}