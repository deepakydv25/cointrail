import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import api from '../api/axios';
import { loginSession, logoutSession } from '../api/session';
import { makeToken } from '../test/session';
import { createRecurringTransaction, getRecurringTransaction, getRecurringTransactions, updateRecurringTransaction, pauseRecurringTransaction, resumeRecurringTransaction, cancelRecurringTransaction, validateRecurringDates } from './recurringTransactionService';
import { recurrenceFrequencies, recurringStatuses } from '../types/recurringTransaction';

const originalAdapter = api.defaults.adapter;
const id = '9223372036854775807'; const accountId = '9007199254740993'; const categoryId = '9007199254740995';
const request = { accountId, categoryId, amount: '99999999999999999.99', description: null, type: 'EXPENSE' as const, frequency: 'MONTHLY' as const, startDate: '2099-01-31', endDate: null };
const json = (amount = request.amount, status = 'ACTIVE') => `{"id":${id},"accountId":${accountId},"accountName":"Historical account","categoryId":${categoryId},"categoryName":"Historical category","amount":${amount},"type":"EXPENSE","description":null,"frequency":"MONTHLY","startDate":"2099-01-31","endDate":null,"nextDueDate":${status === 'CANCELLED' || status === 'COMPLETED' ? 'null' : '"2099-01-31"'},"status":"${status}","blockedReason":${status === 'BLOCKED' ? '"ACCOUNT_INACTIVE"' : 'null'},"createdAt":"2026-10-09T00:00:00","updatedAt":"2026-10-09T00:00:00"}`;
const response = (config: InternalAxiosRequestConfig, data: string, status = 200) => ({ config, data, status, statusText: '', headers: new AxiosHeaders() });
beforeEach(() => loginSession(makeToken()));
afterEach(() => { api.defaults.adapter = originalAdapter; logoutSession(); vi.restoreAllMocks(); });

describe('Recurring lossless contracts', () => {
    it('sends exact filters/pagination/sort and preserves numeric metadata, FK IDs, signal and auth', async () => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, config.url === '/api/recurring-transactions' ? `{"content":[${json()}],"number":2,"size":5,"totalElements":9007199254740993,"totalPages":2147483647}` : json())); api.defaults.adapter = adapter;
        const signal = new AbortController().signal; const query = { status: 'BLOCKED' as const, type: 'EXPENSE' as const, accountId, categoryId, page: '2', size: '5', sort: 'nextDueDate,asc' as const };
        const page = await getRecurringTransactions(query, signal); const detail = await getRecurringTransaction(id, signal);
        expect(page.content).toEqual([detail]); expect(page).toMatchObject({ number: '2', totalElements: '9007199254740993', totalPages: '2147483647' });
        expect(detail).toMatchObject({ id, accountId, categoryId, amount: request.amount, description: null, endDate: null });
        expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/api/recurring-transactions', method: 'get', signal, params: query });
        expect(Object.fromEntries(new URL(api.getUri(adapter.mock.calls[0][0])).searchParams)).toEqual(query);
        expect(adapter.mock.calls[1][0]).toMatchObject({ url: `/api/recurring-transactions/${id}`, signal });
        expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe(`Bearer ${localStorage.getItem('accessToken')}`);
    });
    it.each(['99999999999999999.99', '0.01', '10.00'])('serializes full creation and only allowed replacement fields exactly for %s', async amount => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, json(amount))); api.defaults.adapter = adapter;
        await createRecurringTransaction({ ...request, amount, description: 'A "quote"\nline' }); await updateRecurringTransaction(id, { ...request, amount, description: '' });
        expect(adapter.mock.calls[0][0]).toMatchObject({ method: 'post', url: '/api/recurring-transactions', data: `{"accountId":${accountId},"categoryId":${categoryId},"amount":${amount},"description":"A \\"quote\\"\\nline","type":"EXPENSE","frequency":"MONTHLY","startDate":"2099-01-31","endDate":null}` });
        expect(adapter.mock.calls[1][0]).toMatchObject({ method: 'put', url: `/api/recurring-transactions/${id}`, data: `{"accountId":${accountId},"categoryId":${categoryId},"amount":${amount},"description":""}` });
    });
    it.each(recurrenceFrequencies)('supports frequency %s and income creation', async frequency => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, json())); api.defaults.adapter = adapter;
        await createRecurringTransaction({ ...request, type: 'INCOME', frequency, endDate: '2099-12-31' });
        expect(adapter.mock.calls[0][0].data).toContain(`"frequency":"${frequency}"`); expect(adapter.mock.calls[0][0].data).toContain('"type":"INCOME"'); expect(adapter.mock.calls[0][0].data).toContain('"endDate":"2099-12-31"');
    });
    it.each(recurringStatuses)('reads actual lifecycle status %s including nullable terminal cursor', async status => {
        api.defaults.adapter = async config => response(config, json(request.amount, status));
        expect(await getRecurringTransaction(id)).toMatchObject({ status, nextDueDate: ['CANCELLED', 'COMPLETED'].includes(status) ? null : '2099-01-31', blockedReason: status === 'BLOCKED' ? 'ACCOUNT_INACTIVE' : null });
    });
    it('pause/resume are bodyless and use returned states; DELETE cancels with204', async () => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, config.method === 'delete' ? '' : json(request.amount, config.url?.endsWith('/pause') ? 'PAUSED' : 'COMPLETED'), config.method === 'delete' ? 204 : 200)); api.defaults.adapter = adapter;
        expect((await pauseRecurringTransaction(id)).status).toBe('PAUSED'); expect((await resumeRecurringTransaction(id)).status).toBe('COMPLETED'); expect(await cancelRecurringTransaction(id)).toBeUndefined();
        expect(adapter.mock.calls.map(([config]) => [config.method, config.url, config.data])).toEqual([['post', `/api/recurring-transactions/${id}/pause`, undefined], ['post', `/api/recurring-transactions/${id}/resume`, undefined], ['delete', `/api/recurring-transactions/${id}`, undefined]]);
    });
    it('blocked association repair preserves a null description and the exact amount', async () => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, json(request.amount, 'BLOCKED'))); api.defaults.adapter = adapter;
        expect((await updateRecurringTransaction(id, request)).status).toBe('BLOCKED'); expect(adapter.mock.calls[0][0].data).toBe(`{"accountId":${accountId},"categoryId":${categoryId},"amount":99999999999999999.99,"description":null}`);
    });
    it.each(['0', '-0.01', '-99999999999999999.99', '1.001', '100000000000000000', '1e2', ''])('rejects invalid positive amount %s without dispatch', async amount => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(createRecurringTransaction({ ...request, amount })).rejects.toMatchObject({ kind: 'validation', fieldErrors: { amount: expect.any(String) } }); await expect(updateRecurringTransaction(id, { ...request, amount })).rejects.toMatchObject({ kind: 'validation' }); expect(adapter).not.toHaveBeenCalled();
    });
    it.each(['0', '9223372036854775808', '1e2'])('rejects invalid path/FK %s', async invalid => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(getRecurringTransaction(invalid)).rejects.toMatchObject({ kind: 'not-found' }); await expect(createRecurringTransaction({ ...request, accountId: invalid })).rejects.toMatchObject({ kind: 'not-found' }); expect(adapter).not.toHaveBeenCalled();
    });
    it.each([['2000-02-29', '2000-02-29'], ['0001-01-01', null], ['9999-12-31', null]])('validates calendar %s without inventing a browser-today restriction', (start, end) => expect(() => validateRecurringDates(start, end)).not.toThrow());
    it.each([['1900-02-29', null], ['0000-01-01', null], ['10000-01-01', null], ['2099-02-01', '2099-01-31'], ['2099-01-31', '2099-02-30']])('rejects invalid date range %s/%s', async (startDate, endDate) => {
        const adapter = vi.fn(); api.defaults.adapter = adapter; await expect(createRecurringTransaction({ ...request, startDate, endDate })).rejects.toMatchObject({ kind: 'validation' }); expect(adapter).not.toHaveBeenCalled();
    });
    it('enforces500 description characters and validates query/supported enums', async () => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, json())); api.defaults.adapter = adapter;
        await createRecurringTransaction({ ...request, description: 'x'.repeat(500) });
        await expect(createRecurringTransaction({ ...request, description: 'x'.repeat(501) })).rejects.toMatchObject({ fieldErrors: { description: expect.any(String) } });
        await expect(getRecurringTransactions({ page: '0', size: '20', sort: 'amount,desc' as never })).rejects.toMatchObject({ kind: 'validation' });
        await expect(createRecurringTransaction({ ...request, frequency: 'HOURLY' as never })).rejects.toMatchObject({ kind: 'validation' }); expect(adapter).toHaveBeenCalledOnce();
    });
    it.each([400, 404, 409])('preserves authoritative HTTP%s validation', async status => {
        api.defaults.adapter = config => Promise.reject(new AxiosError('Rejected', '', config, undefined, response(config, '{"message":"Rejected","errors":{"accountId":"Unavailable account"}}', status)));
        await expect(updateRecurringTransaction(id, request)).rejects.toMatchObject({ status, fieldErrors: { accountId: 'Unavailable account' } });
    });
    it('reports timeout and never automatically retries mutations', async () => {
        const adapter = vi.fn((config: InternalAxiosRequestConfig) => Promise.reject(new AxiosError('timeout', 'ECONNABORTED', config))); api.defaults.adapter = adapter;
        await expect(pauseRecurringTransaction(id)).rejects.toMatchObject({ kind: 'timeout' }); expect(adapter).toHaveBeenCalledOnce();
    });
    it('cancels aborted reads and suppresses stale session reads and mutations', async () => {
        const controller = new AbortController(); controller.abort(); const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(getRecurringTransactions({ page: '0', size: '20', sort: 'createdAt,desc' }, controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' }); expect(adapter).not.toHaveBeenCalled();
        for (const operation of [() => getRecurringTransaction(id), () => updateRecurringTransaction(id, request)]) {
            let finish!: () => void; let start!: () => void; const ready = new Promise<void>(resolve => { start = resolve; });
            api.defaults.adapter = config => new Promise(resolve => { finish = () => resolve(response(config, json())); start(); });
            const pending = operation().catch(error => error); await ready; const token = makeToken(undefined, `${Math.random()}@example.com`); loginSession(token); finish();
            expect(await pending).toMatchObject({ code: 'ERR_CANCELED' }); expect(localStorage.getItem('accessToken')).toBe(token);
        }
    });
});
