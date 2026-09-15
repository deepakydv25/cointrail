import api from '../api/axios';
import type { CreateExpenseRequest, Expense, UpdateExpenseRequest } from '../types/expense';

export interface ExpensePage {
    content: Expense[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export const getExpenses = async (
    page: number = 0,
    size: number = 10
): Promise<ExpensePage> => {
    const response = await api.get<ExpensePage>('/expenses', {
        params: {
            page,
            size,
        },
    });
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

export const updateExpense = async (
    id: number,
    data: UpdateExpenseRequest
) : Promise<Expense> => {
    const response = await api.put<Expense>(
        `/expenses/${id}`,
        data
    );

    return response.data;
};

export const deleteExpense = async (id: number): Promise<void> => {
    await api.delete(`/expenses/${id}`);
};