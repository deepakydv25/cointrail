import api from '../api/axios';
import { financialConfig, longId, monetaryNumber } from '../api/financial';
import type { AccountResponse, CreateAccountRequest, UpdateAccountRequest } from '../types/account';

export async function getAccounts(signal?: AbortSignal): Promise<AccountResponse[]> {
    return (await api.get('/api/accounts', { ...financialConfig, signal })).data;
}
export async function getAccount(id: string, signal?: AbortSignal): Promise<AccountResponse> {
    return (await api.get(`/api/accounts/${longId(id)}`, { ...financialConfig, signal })).data;
}
export async function createAccount(request: CreateAccountRequest): Promise<AccountResponse> {
    const body = { name: request.name, type: request.type, openingBalance: monetaryNumber(request.openingBalance) };
    return (await api.post('/api/accounts', body, financialConfig)).data;
}
export async function updateAccount(id: string, request: UpdateAccountRequest): Promise<AccountResponse> {
    return (await api.put(`/api/accounts/${longId(id)}`, { name: request.name, type: request.type }, financialConfig)).data;
}
export async function deactivateAccount(id: string): Promise<void> {
    await api.delete(`/api/accounts/${longId(id)}`, financialConfig);
}
