import api from '../api/axios';
import type { Expense } from '../types/expense';

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