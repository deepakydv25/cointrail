import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import api from '../api/axios';
import { loginSession, logoutSession } from '../api/session';
import { makeToken } from '../test/session';
import { financialConfig, formatMoney, identifierNumber, longId, monetaryNumber } from '../api/financial';
import { createAccount, deactivateAccount, getAccount, getAccounts, updateAccount } from './accountService';
import { createCategory, deactivateCategory, getCategories, getCategory, updateCategory } from './categoryService';
import { createExpense } from './expenseService';

const originalAdapter = api.defaults.adapter;
const id = '9223372036854775807';
const accountJson = (balance: string) => `{"id":${id},"name":"Bank","type":"BANK","openingBalance":${balance},"active":true,"createdAt":"2026-10-09T10:00:00","updatedAt":"2026-10-09T10:00:00"}`;
const categoryJson = `{"id":${id},"name":"Food","type":"EXPENSE","system":true,"active":true,"createdAt":"2026-10-09T10:00:00","updatedAt":"2026-10-09T10:00:00"}`;
const response = (config: InternalAxiosRequestConfig, data: string, status = 200) => ({ config, data, status, statusText: '', headers: new AxiosHeaders() });
beforeEach(() => loginSession(makeToken()));
afterEach(() => { api.defaults.adapter = originalAdapter; logoutSession(); vi.restoreAllMocks(); });

describe('V2 precision and actual service contracts', () => {
    it.each(['99999999999999999.99', '-99999999999999999.99', '0.01', '0'])('writes and reads %s exactly, including Long IDs', async balance => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, accountJson(balance), 201));
        api.defaults.adapter = adapter;
        expect(await createAccount({ name: 'Bank', type: 'BANK', openingBalance: balance })).toEqual({
            id, name: 'Bank', type: 'BANK', openingBalance: balance, active: true,
            createdAt: '2026-10-09T10:00:00', updatedAt: '2026-10-09T10:00:00',
        });
        const config = adapter.mock.calls[0][0];
        expect(config.method).toBe('post'); expect(config.url).toBe('/api/accounts');
        expect(config.data).toBe(`{"name":"Bank","type":"BANK","openingBalance":${balance}}`);
        expect(config.headers.get('Authorization')).toBe(`Bearer ${localStorage.getItem('accessToken')}`);
    });

    it('uses raw active arrays, exact routes, replacement fields and bodyless DELETE', async () => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config,
            config.method === 'delete' ? '' : config.method === 'put' ? accountJson('12.30').replace('"name":"Bank","type":"BANK"', '"name":"Wallet","type":"WALLET"')
                : config.url === '/api/accounts' ? `[${accountJson('12.30')}]` : accountJson('12.30'),
            config.method === 'delete' ? 204 : 200));
        api.defaults.adapter = adapter;
        expect(await getAccounts()).toMatchObject([{ id, openingBalance: '12.30' }]);
        expect(await getAccount(id)).toMatchObject({ id });
        expect(await updateAccount(id, { name: 'Wallet', type: 'WALLET' })).toMatchObject({ id, name: 'Wallet', type: 'WALLET', openingBalance: '12.30' });
        expect(await deactivateAccount(id)).toBeUndefined();
        expect(adapter.mock.calls.map(([config]) => [config.method, config.url, config.data])).toEqual([
            ['get', '/api/accounts', undefined], ['get', `/api/accounts/${id}`, undefined],
            ['put', `/api/accounts/${id}`, '{"name":"Wallet","type":"WALLET"}'], ['delete', `/api/accounts/${id}`, undefined],
        ]);
    });

    it('preserves category IDs and sends name/type at create, name only at rename', async () => {
        const customId = '9007199254740993';
        const createdId = '9007199254740994';
        const customJson = categoryJson.replace(id, customId).replace('"name":"Food"', '"name":"Lunch"').replace('"system":true', '"system":false');
        const createdJson = customJson.replace(customId, createdId).replace('"name":"Lunch","type":"EXPENSE"', '"name":"Bonus","type":"INCOME"');
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config,
            config.method === 'delete' ? '' : config.method === 'post' ? createdJson
                : config.method === 'put' ? customJson.replace('"name":"Lunch"', '"name":"Dinner"')
                    : config.url === '/api/categories' ? `[${categoryJson},${customJson}]` : customJson,
            config.method === 'delete' ? 204 : config.method === 'post' ? 201 : 200));
        api.defaults.adapter = adapter;
        expect(await getCategories()).toMatchObject([{ id, system: true, type: 'EXPENSE' }, { id: customId, system: false, type: 'EXPENSE' }]);
        expect(await getCategory(customId)).toMatchObject({ id: customId, name: 'Lunch', system: false });
        expect(await createCategory({ name: 'Bonus', type: 'INCOME' })).toMatchObject({ id: createdId, name: 'Bonus', type: 'INCOME', system: false, active: true });
        expect(await updateCategory(customId, { name: 'Dinner' })).toMatchObject({ id: customId, name: 'Dinner', type: 'EXPENSE', system: false });
        expect(await deactivateCategory(customId)).toBeUndefined();
        expect(adapter.mock.calls.map(([config]) => [config.method, config.url, config.data])).toEqual([
            ['get', '/api/categories', undefined], ['get', `/api/categories/${customId}`, undefined],
            ['post', '/api/categories', '{"name":"Bonus","type":"INCOME"}'],
            ['put', `/api/categories/${customId}`, '{"name":"Dinner"}'], ['delete', `/api/categories/${customId}`, undefined],
        ]);
    });

    it.each(['1.234', '100000000000000000', 'NaN', '1e2', '1,000', ''])('rejects invalid balance %s before dispatch without rounding', async balance => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(createAccount({ name: 'Bank', type: 'BANK', openingBalance: balance })).rejects.toMatchObject({ kind: 'validation', fieldErrors: { openingBalance: expect.any(String) } });
        expect(adapter).not.toHaveBeenCalled();
    });

    it('supports exact nested IDs and future numeric foreign-key payloads', async () => {
        // Synthetic precision transform fixture, not an Account API response shape.
        api.defaults.adapter = async config => {
            expect(config.data).toBe(`{"accountId":${id},"categoryId":9007199254740993,"amount":-99999999999999999.99}`);
            return response(config, `{"items":[{"accountId":${id},"amount":99999999999999999.99}],"count":9007199254740993}`);
        };
        const result = await api.post('/api/accounts', { accountId: identifierNumber(id), categoryId: identifierNumber('9007199254740993'), amount: monetaryNumber('-99999999999999999.99') }, financialConfig);
        expect(result.data).toEqual({ items: [{ accountId: id, amount: '99999999999999999.99' }], count: '9007199254740993' });
    });

    it.each(['9007199254740993', id])('keeps %s in route paths', async value => {
        api.defaults.adapter = async config => { expect(config.url).toBe(`/api/categories/${value}`); return response(config, categoryJson.replace(id, value)); };
        expect((await getCategory(value)).id).toBe(value);
    });

    it.each(['0', '-1', '1/other', '9223372036854775808'])('rejects invalid Long ID %s', value => {
        expect(() => longId(value)).toThrow();
    });

    it.each([400, 404, 409])('retains normalized JSON HTTP %s errors', async status => {
        api.defaults.adapter = config => Promise.reject(new AxiosError('Failed', '', config, undefined,
            response(config, `{"status":${status},"message":"Rejected","errors":{"name":"Name rejected"}}`, status)));
        await expect(getAccounts()).rejects.toMatchObject({ status, message: 'Rejected', fieldErrors: { name: 'Name rejected' } });
    });

    it.each(['', 'Unauthorized'])('expires auth for a non-JSON 401 (%s)', async body => {
        api.defaults.adapter = config => Promise.reject(new AxiosError('Failed', '', config, undefined, response(config, body, 401)));
        await expect(getAccounts()).rejects.toMatchObject({ status: 401, kind: 'auth' });
        expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('supports cancellation and leaves V1 numeric contracts unchanged', async () => {
        const controller = new AbortController(); controller.abort();
        await expect(getAccounts(controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
        api.defaults.adapter = async config => {
            expect(config.url).toBe('/api/v1/expenses/create');
            expect(config.data).toBe('{"amount":12.34,"category":"FOOD","description":"Lunch","expenseDate":"2026-10-09"}');
            return response(config, '{"id":7,"amount":12.34}');
        };
        expect(await createExpense({ amount: 12.34, category: 'FOOD', description: 'Lunch', expenseDate: '2026-10-09' })).toEqual({ id: 7, amount: 12.34 });
    });

    it('discards exact financial data from a replaced session', async () => {
        let complete!: () => void;
        let started!: () => void;
        const ready = new Promise<void>(resolve => { started = resolve; });
        api.defaults.adapter = config => new Promise(resolve => {
            complete = () => resolve(response(config, `[${accountJson('99999999999999999.99')}]`)); started();
        });
        const pending = getAccounts().catch(error => error);
        await ready; loginSession(makeToken(undefined, 'other@example.com')); complete();
        expect(await pending).toMatchObject({ code: 'ERR_CANCELED' });
    });

    it('formats INR without a Number conversion', () => {
        expect(formatMoney('99999999999999999.99')).toBe('₹99,99,99,99,99,99,99,999.99');
        expect(formatMoney('-99999999999999999.99')).toBe('-₹99,99,99,99,99,99,99,999.99');
        expect(formatMoney('0.01')).toBe('₹0.01'); expect(formatMoney('0')).toBe('₹0.00');
    });
});
