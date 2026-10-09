import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import api from '../api/axios';
import { loginSession, logoutSession } from '../api/session';
import { makeToken } from '../test/session';
import { createTransaction, getTransaction, getTransactions, updateTransaction, deleteTransaction } from './transactionService';
import { transactionQuery } from '../pages/transactions/query';
import type { CreateTransactionRequest } from '../types/transaction';

const originalAdapter = api.defaults.adapter;
const id = '9223372036854775807'; const accountId = '9007199254740993'; const categoryId = '9007199254740994';
const request: CreateTransactionRequest = { accountId, categoryId, type: 'EXPENSE', amount: '99999999999999999.99', description: null, transactionDate: '2026-10-01' };
const json = (type = 'EXPENSE', amount = '99999999999999999.99', description: string | null = null) => `{"id":${id},"type":"${type}","amount":${amount},"description":${JSON.stringify(description)},"transactionDate":"2026-10-01","accountId":${accountId},"accountName":"Bank","categoryId":${categoryId},"categoryName":"Category","createdAt":"2026-10-01T12:00:00","updatedAt":"2026-10-01T12:00:00"}`;
const response = (config: InternalAxiosRequestConfig, data: string, status = 200) => ({ config, data, status, statusText: '', headers: new AxiosHeaders() });
beforeEach(() => loginSession(makeToken()));
afterEach(() => { api.defaults.adapter = originalAdapter; logoutSession(); vi.restoreAllMocks(); });

describe('actual V2 transaction transport', () => {
    it.each(['EXPENSE', 'INCOME'] as const)('serializes exact %s replacement payloads and parses IDs/money', async type => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, json(type), config.method === 'post' ? 201 : 200));
        api.defaults.adapter = adapter;
        expect(await createTransaction({ ...request, type })).toMatchObject({ id, accountId, categoryId, amount: request.amount, type, description: null });
        expect(await updateTransaction(id, { ...request, type })).toMatchObject({ type, amount: request.amount });
        const body = `{"accountId":${accountId},"categoryId":${categoryId},"type":"${type}","amount":99999999999999999.99,"description":null,"transactionDate":"2026-10-01"}`;
        expect(adapter.mock.calls.map(([config]) => [config.method, config.url, config.data])).toEqual([
            ['post', '/api/transactions', body], ['put', `/api/transactions/${id}`, body],
        ]);
        expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe(`Bearer ${localStorage.getItem('accessToken')}`);
    });
    it('gets historical detail and deletes with a bodyless 204', async () => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, config.method === 'delete' ? '' : json(), config.method === 'delete' ? 204 : 200));
        api.defaults.adapter = adapter;
        expect(await getTransaction(id)).toMatchObject({ id, accountName: 'Bank', categoryName: 'Category' });
        expect(await deleteTransaction(id)).toBeUndefined();
        expect(adapter.mock.calls.map(([config]) => [config.method, config.url, config.data])).toEqual([
            ['get', `/api/transactions/${id}`, undefined], ['delete', `/api/transactions/${id}`, undefined],
        ]);
    });
    it('serializes the maximum Java Long as numeric foreign keys without losing digits', async () => {
        api.defaults.adapter = async config => {
            expect(config.data).toContain(`"accountId":${id},"categoryId":${id}`);
            return response(config, json().replace(`"accountId":${accountId}`, `"accountId":${id}`).replace(`"categoryId":${categoryId}`, `"categoryId":${id}`), 201);
        };
        expect(await createTransaction({ ...request, accountId: id, categoryId: id })).toMatchObject({ accountId: id, categoryId: id });
    });
    it.each(['0', '9223372036854775808', '9007199254740993.1'])('rejects invalid foreign Long ID %s before dispatch', async accountId => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(createTransaction({ ...request, accountId })).rejects.toMatchObject({ status: 404 });
        expect(adapter).not.toHaveBeenCalled();
    });
    it('sends exact filter/page/sort parameters and preserves raw Page numeric precision', async () => {
        const query = transactionQuery(`?type=INCOME&accountId=${accountId}&categoryId=${categoryId}&from=2026-01-01&to=2026-10-01&page=1&size=100&sort=amount,asc`);
        api.defaults.adapter = async config => {
            expect(config.url).toBe('/api/transactions'); expect(config.params).toEqual(query);
            const url = new URL(api.getUri(config));
            expect(Object.fromEntries(url.searchParams)).toEqual({ ...query });
            return response(config, `{"content":[${json('INCOME')}],"number":1,"size":100,"totalElements":9007199254740993,"totalPages":90071993,"first":false,"last":false,"empty":false}`);
        };
        expect(await getTransactions(query)).toMatchObject({ content: [{ id, type: 'INCOME' }], number: '1', size: '100', totalElements: '9007199254740993', totalPages: '90071993' });
    });
    it.each(['0.01', '1', '99999999999999999.99'])('preserves valid amount %s and optional descriptions', async amount => {
        api.defaults.adapter = async config => {
            expect(config.data).toContain(`"amount":${amount},`); expect(config.data).toContain('"description":"Dinner"');
            return response(config, json('EXPENSE', amount, 'Dinner'), 201);
        };
        expect((await createTransaction({ ...request, amount, description: 'Dinner' })).amount).toBe(amount);
    });
    it.each(['0', '-0.01', '-99999999999999999.99', '1.234', '100000000000000000', '', '1e2'])('rejects %s without rounding or dispatch', async amount => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(createTransaction({ ...request, amount })).rejects.toMatchObject({ kind: 'validation', fieldErrors: { amount: expect.any(String) } });
        expect(adapter).not.toHaveBeenCalled();
    });
    it.each([400, 404, 409, 500])('retains HTTP %s normalization', async status => {
        api.defaults.adapter = config => Promise.reject(new AxiosError('Failed', '', config, undefined, response(config,
            '{"message":"Rejected","errors":{"transactionDate":"must be a date in the past or in the present"}}', status)));
        await expect(updateTransaction(id, request)).rejects.toMatchObject({ status, fieldErrors: { transactionDate: expect.any(String) } });
    });
    it('honors abort signals and replaced sessions', async () => {
        const controller = new AbortController(); controller.abort();
        await expect(getTransaction(id, controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
        let complete!: () => void; let started!: () => void;
        const ready = new Promise<void>(resolve => { started = resolve; });
        api.defaults.adapter = config => new Promise(resolve => { complete = () => resolve(response(config, json())); started(); });
        const pending = getTransaction(id).catch(error => error);
        await ready; loginSession(makeToken(undefined, 'other@example.com')); complete();
        expect(await pending).toMatchObject({ code: 'ERR_CANCELED' });
    });
    it.each(['?page=-1', '?size=101', '?sort=accountName,asc', '?type=OTHER', '?from=2026-02-30', '?from=2026-10-02&to=2026-10-01', '?accountId=9223372036854775808'])('rejects unsupported filter input %s', search => {
        expect(() => transactionQuery(search)).toThrow();
    });
    it('allows exact unknown IDs, leap dates and all backend sort fields', () => {
        expect(transactionQuery('?accountId=9223372036854775807&from=2024-02-29')).toMatchObject({ accountId: id, from: '2024-02-29', page: '0', size: '20', sort: 'transactionDate,desc' });
        for (const field of ['transactionDate', 'amount', 'createdAt', 'updatedAt']) for (const direction of ['asc', 'desc'])
            expect(transactionQuery(`?sort=${field},${direction}`).sort).toBe(`${field},${direction}`);
    });
});
