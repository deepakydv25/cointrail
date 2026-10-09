import api from '../api/axios';
import { financialConfig, identifierNumber, longId } from '../api/financial';
import { ApiError } from '../api/errors';
import { transactionAmount } from './transactionService';
import { isDate } from '../pages/transactions/query';
import { recurringQuery, recurringSearch } from '../pages/recurring/query';
import { recurrenceFrequencies } from '../types/recurringTransaction';
import { transactionTypes } from '../types/transaction';
import type { CreateRecurringTransactionRequest, UpdateRecurringTransactionRequest, RecurringTransactionResponse, RecurringPage, RecurringQuery } from '../types/recurringTransaction';

export function validateRecurringDates(startDate: string, endDate: string | null) {
    const errors: Record<string, string> = {};
    if (!isDate(startDate)) errors.startDate = 'Use a valid date within years 0001 to 9999.';
    if (endDate !== null && (!isDate(endDate) || (isDate(startDate) && endDate < startDate))) errors.endDate = 'Use a valid end date on or after the start date.';
    if (Object.keys(errors).length) throw new ApiError('Check your recurrence dates.', 'validation', 400, errors);
    // Browser-local today is not the backend recurring clock; the server checks it.
}
function payload(request: UpdateRecurringTransactionRequest) {
    if (request.description !== null && request.description.length > 500) throw new ApiError('Check your description.', 'validation', 400, { description: 'Use at most 500 characters.' });
    return { accountId: identifierNumber(request.accountId), categoryId: identifierNumber(request.categoryId), amount: transactionAmount(request.amount), description: request.description };
}
export async function getRecurringTransactions(query: RecurringQuery, signal?: AbortSignal): Promise<RecurringPage> {
    const params = recurringQuery(recurringSearch(query));
    return (await api.get<RecurringPage>('/api/recurring-transactions', { ...financialConfig, params, signal })).data;
}
export async function getRecurringTransaction(id: string, signal?: AbortSignal): Promise<RecurringTransactionResponse> {
    return (await api.get<RecurringTransactionResponse>(`/api/recurring-transactions/${longId(id)}`, { ...financialConfig, signal })).data;
}
export async function createRecurringTransaction(request: CreateRecurringTransactionRequest): Promise<RecurringTransactionResponse> {
    validateRecurringDates(request.startDate, request.endDate);
    if (!transactionTypes.includes(request.type) || !recurrenceFrequencies.includes(request.frequency)) throw new ApiError('Choose a supported type and frequency.', 'validation', 400);
    return (await api.post<RecurringTransactionResponse>('/api/recurring-transactions', { ...payload(request), type: request.type, frequency: request.frequency, startDate: request.startDate, endDate: request.endDate }, financialConfig)).data;
}
export async function updateRecurringTransaction(id: string, request: UpdateRecurringTransactionRequest): Promise<RecurringTransactionResponse> {
    return (await api.put<RecurringTransactionResponse>(`/api/recurring-transactions/${longId(id)}`, payload(request), financialConfig)).data;
}
export async function pauseRecurringTransaction(id: string): Promise<RecurringTransactionResponse> {
    return (await api.post<RecurringTransactionResponse>(`/api/recurring-transactions/${longId(id)}/pause`, undefined, financialConfig)).data;
}
export async function resumeRecurringTransaction(id: string): Promise<RecurringTransactionResponse> {
    return (await api.post<RecurringTransactionResponse>(`/api/recurring-transactions/${longId(id)}/resume`, undefined, financialConfig)).data;
}
export async function cancelRecurringTransaction(id: string): Promise<void> {
    await api.delete(`/api/recurring-transactions/${longId(id)}`, financialConfig);
}
