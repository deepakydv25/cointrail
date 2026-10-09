import api from '../api/axios';
import { financialConfig, identifierNumber, longId } from '../api/financial';
import { transactionAmount } from './transactionService';
import { validatePeriod } from '../pages/dashboard/period';
import type { BudgetPeriod, BudgetResponse, CreateBudgetRequest, UpdateBudgetRequest } from '../types/budget';

export async function getBudgets(period: BudgetPeriod, signal?: AbortSignal): Promise<BudgetResponse[]> {
    return (await api.get<BudgetResponse[]>('/api/budgets', { ...financialConfig, params: validatePeriod(period), signal })).data;
}
export async function getBudget(id: string, signal?: AbortSignal): Promise<BudgetResponse> {
    return (await api.get<BudgetResponse>(`/api/budgets/${longId(id)}`, { ...financialConfig, signal })).data;
}
export async function createBudget(request: CreateBudgetRequest): Promise<BudgetResponse> {
    const period = validatePeriod(request);
    return (await api.post<BudgetResponse>('/api/budgets', {
        categoryId: identifierNumber(request.categoryId), year: Number(period.year), month: Number(period.month),
        amount: transactionAmount(request.amount),
    }, financialConfig)).data;
}
export async function updateBudget(id: string, request: UpdateBudgetRequest): Promise<BudgetResponse> {
    return (await api.put<BudgetResponse>(`/api/budgets/${longId(id)}`, { amount: transactionAmount(request.amount) }, financialConfig)).data;
}
export async function deleteBudget(id: string): Promise<void> {
    await api.delete(`/api/budgets/${longId(id)}`, financialConfig);
}
