import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import api from '../api/axios';
import { loginSession, logoutSession } from '../api/session';
import { makeToken } from '../test/session';
import { createBudget, deleteBudget, getBudget, getBudgets, updateBudget } from './budgetService';

const originalAdapter = api.defaults.adapter;
const id = '9223372036854775807'; const categoryId = '9007199254740993'; const period = { year: '2024', month: '2' };
const json = (amount = '99999999999999999.99') => `{"id":${id},"categoryId":${categoryId},"categoryName":"Historical category","year":2024,"month":2,"amount":${amount},"spentAmount":199999999999999999.98,"remainingAmount":-99999999999999999.99,"overBudget":true,"createdAt":"2024-02-01T00:00:00","updatedAt":"2024-02-01T00:00:00"}`;
const response = (config: InternalAxiosRequestConfig, data: string, status = 200) => ({ config, data, status, statusText: '', headers: new AxiosHeaders() });
beforeEach(() => loginSession(makeToken()));
afterEach(() => { api.defaults.adapter = originalAdapter; logoutSession(); vi.restoreAllMocks(); });

describe('Budget financial API contracts', () => {
    it('uses list/detail paths, explicit period, signal and bearer; preserves aggregates and Long IDs', async () => {
        const controller = new AbortController(); const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, config.url === '/api/budgets' ? `[${json()}]` : json())); api.defaults.adapter = adapter;
        const list = await getBudgets(period, controller.signal); const detail = await getBudget(id, controller.signal);
        expect(list).toEqual([detail]); expect(detail).toMatchObject({ id, categoryId, year: '2024', month: '2', amount: '99999999999999999.99', spentAmount: '199999999999999999.98', remainingAmount: '-99999999999999999.99', overBudget: true });
        expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/api/budgets', method: 'get', params: period, signal: controller.signal });
        expect(Object.fromEntries(new URL(api.getUri(adapter.mock.calls[0][0])).searchParams)).toEqual(period);
        expect(adapter.mock.calls[1][0]).toMatchObject({ url: `/api/budgets/${id}`, signal: controller.signal });
        expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe(`Bearer ${localStorage.getItem('accessToken')}`);
    });
    it.each(['99999999999999999.99', '0.01', '1', '10.00'])('serializes create and amount-only update exactly for %s', async amount => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, json(amount))); api.defaults.adapter = adapter;
        await createBudget({ ...period, categoryId, amount }); await updateBudget(id, { amount });
        expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/api/budgets', method: 'post', data: `{"categoryId":${categoryId},"year":2024,"month":2,"amount":${amount}}` });
        expect(adapter.mock.calls[1][0]).toMatchObject({ url: `/api/budgets/${id}`, method: 'put', data: `{"amount":${amount}}` });
    });
    it('deletes the definition with no request body and accepts204', async () => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, '', 204)); api.defaults.adapter = adapter;
        expect(await deleteBudget(id)).toBeUndefined(); expect(adapter.mock.calls[0][0]).toMatchObject({ url: `/api/budgets/${id}`, method: 'delete' }); expect(adapter.mock.calls[0][0].data).toBeUndefined();
    });
    it.each([{ year: '0001', month: '1' }, { year: '0099', month: '2' }, { year: '9999', month: '12' }])('sends valid calendar boundary %j without monetary conversion', async boundary => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, json())); api.defaults.adapter = adapter;
        await createBudget({ ...boundary, categoryId, amount: '0.01' });
        expect(adapter.mock.calls[0][0].data).toBe(`{"categoryId":${categoryId},"year":${BigInt(boundary.year)},"month":${boundary.month},"amount":0.01}`);
    });
    it.each(['0', '-0.01', '-99999999999999999.99', '1.001', '100000000000000000', '1e2', '', 'NaN'])('rejects invalid positive amount %s before dispatch', async amount => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(createBudget({ ...period, categoryId, amount })).rejects.toMatchObject({ kind: 'validation', fieldErrors: { amount: expect.any(String) } });
        await expect(updateBudget(id, { amount })).rejects.toMatchObject({ kind: 'validation' }); expect(adapter).not.toHaveBeenCalled();
    });
    it.each([{ year: '0', month: '1' }, { year: '10000', month: '1' }, { year: '2024', month: '13' }])('rejects invalid period %j', async invalid => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(getBudgets(invalid)).rejects.toMatchObject({ kind: 'validation' }); await expect(createBudget({ ...invalid, categoryId, amount: '1' })).rejects.toMatchObject({ kind: 'validation' }); expect(adapter).not.toHaveBeenCalled();
    });
    it.each(['0', '9223372036854775808', '1e2'])('rejects invalid resource/FK %s', async invalid => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(getBudget(invalid)).rejects.toMatchObject({ kind: 'not-found' }); await expect(createBudget({ ...period, categoryId: invalid, amount: '1' })).rejects.toMatchObject({ kind: 'not-found' }); expect(adapter).not.toHaveBeenCalled();
    });
    it.each([400, 404, 409, 500])('keeps HTTP%s error and field validation', async status => {
        api.defaults.adapter = config => Promise.reject(new AxiosError('Rejected', '', config, undefined, response(config, '{"message":"Rejected","errors":{"amount":"Invalid amount"}}', status)));
        await expect(updateBudget(id, { amount: '1' })).rejects.toMatchObject({ status, fieldErrors: { amount: 'Invalid amount' } });
    });
    it('preserves zero spending, signed remaining and an empty array without synthesis', async () => {
        api.defaults.adapter = async config => response(config, config.url === '/api/budgets' ? '[]' : json('0.01').replace('199999999999999999.98', '0'));
        expect(await getBudgets(period)).toEqual([]); expect((await getBudget(id)).spentAmount).toBe('0');
    });
    it('rejects pre-aborted reads and stale session responses', async () => {
        const controller = new AbortController(); controller.abort(); const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(getBudgets(period, controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' }); expect(adapter).not.toHaveBeenCalled();
        let finish!: () => void; let start!: () => void; const ready = new Promise<void>(resolve => { start = resolve; });
        api.defaults.adapter = config => new Promise(resolve => { finish = () => resolve(response(config, json())); start(); });
        const pending = getBudget(id).catch(error => error); await ready; const token = makeToken(undefined, 'new@example.com'); loginSession(token); finish();
        expect(await pending).toMatchObject({ code: 'ERR_CANCELED' }); expect(localStorage.getItem('accessToken')).toBe(token);
    });
});
