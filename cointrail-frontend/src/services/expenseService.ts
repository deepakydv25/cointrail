import api from '../api/axios';
import type { PageResponse } from '../types/api';
import type { CreateExpenseRequest, Expense, UpdateExpenseRequest, ExpenseSummary } from '../types/expense';

export type ExpensePage = PageResponse<Expense>;

export const getExpenses = async (
    page: number = 0,
    size: number = 10,
    sortBy: string = 'expenseDate',
    direction: string = 'desc',
    category: string = ''
): Promise<ExpensePage> => {
    const response = await api.get<ExpensePage>('/api/v1/expenses', {
        params: {
            page,
            size,
            sort: `${sortBy},${direction}`,
            ...(category && { category }),
        },
    });
    return response.data;
};

export const createExpense = async (
    data: CreateExpenseRequest
) : Promise<Expense> => {
    const response = await api.post<Expense>(
        '/api/v1/expenses/create',
        data
    );

    return response.data;
};

export const getExpenseById = async (
    id: number
) : Promise<Expense> => {
    const response = await api.get<Expense>(`/api/v1/expenses/${id}`);

    return response.data;
};

export const updateExpense = async (
    id: number,
    data: UpdateExpenseRequest
) : Promise<Expense> => {
    const response = await api.put<Expense>(
        `/api/v1/expenses/${id}`,
        data
    );

    return response.data;
};

export const deleteExpense = async (id: number): Promise<void> => {
    await api.delete(`/api/v1/expenses/${id}`);
};

export const getExpenseSummary = async (): Promise<ExpenseSummary> => {
    const response = await api.get<ExpenseSummary>(
        '/api/v1/expenses/summary'
    );

    return response.data;
};
