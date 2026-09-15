import api from '../api/axios';
import type { CreateExpenseRequest, Expense } from '../types/expense';

export interface ExpensePage {
    content: Expense[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export const getExpenses = async (): Promise<ExpensePage> => {
    const response = await api.get('/expenses');
    return response.data;
};

export const createExpense = async (
    data: CreateExpenseRequest
) : Promise<Expense> => {
    const response = await api.post<Expense>(
        '/expenses/create',
        data
    );

    return response.data;
};

export const getExpenseById = async (
    id: number
) : Promise<Expense> => {
    const response = await api.get<Expense>(`/expenses/${id}`);

    return response.data;
};