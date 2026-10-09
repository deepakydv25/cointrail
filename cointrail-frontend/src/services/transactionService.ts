import api from '../api/axios';
import { financialConfig, identifierNumber, longId, monetaryNumber } from '../api/financial';
import { ApiError } from '../api/errors';
import type { CreateTransactionRequest, UpdateTransactionRequest, TransactionResponse, TransactionPage, TransactionQuery } from '../types/transaction';

export function transactionAmount(value: string) {
    try {
        const amount = monetaryNumber(value);
        if (value.startsWith('-') || !/[1-9]/.test(value)) throw new Error();
        return amount;
    } catch {
        throw new ApiError('Check your amount.', 'validation', 400, { amount: 'Use a positive amount with up to 17 integer digits and 2 decimal places (minimum 0.01).' });
    }
}
function payload(request: CreateTransactionRequest) {
    return { accountId: identifierNumber(request.accountId), categoryId: identifierNumber(request.categoryId),
        type: request.type, amount: transactionAmount(request.amount), description: request.description, transactionDate: request.transactionDate };
}
export async function getTransactions(query: TransactionQuery, signal?: AbortSignal): Promise<TransactionPage> {
    return (await api.get<TransactionPage>('/api/transactions', { ...financialConfig, params: query, signal })).data;
}
export async function getTransaction(id: string, signal?: AbortSignal): Promise<TransactionResponse> {
    return (await api.get<TransactionResponse>(`/api/transactions/${longId(id)}`, { ...financialConfig, signal })).data;
}
export async function createTransaction(request: CreateTransactionRequest): Promise<TransactionResponse> {
    return (await api.post<TransactionResponse>('/api/transactions', payload(request), financialConfig)).data;
}
export async function updateTransaction(id: string, request: UpdateTransactionRequest): Promise<TransactionResponse> {
    return (await api.put<TransactionResponse>(`/api/transactions/${longId(id)}`, payload(request), financialConfig)).data;
}
export async function deleteTransaction(id: string): Promise<void> {
    await api.delete(`/api/transactions/${longId(id)}`, financialConfig);
}
