import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import api from '../api/axios';
import { loginSession, logoutSession } from '../api/session';
import { makeToken } from '../test/session';
import { getDashboard } from './dashboardService';

const originalAdapter = api.defaults.adapter;
const period = { year: '2026', month: '10' };
const json = (amount = '199999999999999999.98') => `{"year":2026,"month":10,"totalActiveAccountBalance":-${amount},"monthlySummary":{"income":${amount},"expense":0.01,"netCashFlow":-${amount}},"budgetSummary":{"budgetCount":1,"totalBudgetAmount":${amount},"spentOnBudgetedCategories":0,"remainingBudgetAmount":-${amount},"overBudgetCount":9007199254740993},"recentTransactions":[{"id":9223372036854775807,"accountId":9007199254740993,"categoryId":9007199254740994,"description":null,"amount":${amount}}],"pendingRecurringTransactions":{"asOfDate":"2026-10-09","throughDate":"2026-11-08","timezone":"UTC","items":[{"id":9223372036854775807,"overdue":false,"blockedReason":null,"amount":${amount}}]}}`;
const response = (config: InternalAxiosRequestConfig, data: string, status = 200) => ({ config, data, status, statusText: '', headers: new AxiosHeaders() });
beforeEach(() => loginSession(makeToken()));
afterEach(() => { api.defaults.adapter = originalAdapter; logoutSession(); vi.restoreAllMocks(); });

describe('dashboard lossless contract', () => {
    it.each(['99999999999999999.99', '199999999999999999.98', '0.01', '0'])('preserves %s, signed aggregates and nested Longs', async amount => {
        api.defaults.adapter = async config => response(config, json(amount));
        expect(await getDashboard(period)).toMatchObject({ year: '2026', month: '10', totalActiveAccountBalance: `-${amount}`,
            monthlySummary: { income: amount, expense: '0.01', netCashFlow: `-${amount}` },
            budgetSummary: { remainingBudgetAmount: `-${amount}`, overBudgetCount: '9007199254740993' },
            recentTransactions: [{ id: '9223372036854775807', accountId: '9007199254740993', categoryId: '9007199254740994', description: null, amount }],
            pendingRecurringTransactions: { items: [{ id: '9223372036854775807', overdue: false, blockedReason: null, amount }] } });
    });
    it('uses actual path, required params, bearer header and signal with no request body', async () => {
        const controller = new AbortController();
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, json())); api.defaults.adapter = adapter;
        await getDashboard(period, controller.signal);
        const config = adapter.mock.calls[0][0];
        expect(config).toMatchObject({ method: 'get', url: '/api/dashboard', params: period, signal: controller.signal });
        expect(config.data).toBeUndefined(); expect(Object.fromEntries(new URL(api.getUri(config)).searchParams)).toEqual(period);
        expect(config.headers.get('Authorization')).toBe(`Bearer ${localStorage.getItem('accessToken')}`);
    });
    it('rejects invalid periods and pre-aborted requests before dispatch', async () => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(getDashboard({ year: '10000', month: '13' })).rejects.toMatchObject({ kind: 'validation' });
        const controller = new AbortController(); controller.abort();
        await expect(getDashboard(period, controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' }); expect(adapter).not.toHaveBeenCalled();
    });
    it.each([400, 403, 404, 409, 500])('preserves HTTP %s shared error handling', async status => {
        api.defaults.adapter = config => Promise.reject(new AxiosError('Failed', '', config, undefined, response(config, '{"status":400,"message":"Rejected","errors":{"year":"Invalid year"}}', status)));
        await expect(getDashboard(period)).rejects.toMatchObject({ status, fieldErrors: { year: 'Invalid year' } });
    });
    it.each(['ERR_NETWORK', 'ECONNABORTED'])('normalizes %s', async code => {
        api.defaults.adapter = config => Promise.reject(new AxiosError('Failed', code, config));
        await expect(getDashboard(period)).rejects.toMatchObject({ kind: code === 'ERR_NETWORK' ? 'network' : 'timeout' });
    });
    it('rejects malformed successful JSON and expires matching session on bodyless401', async () => {
        api.defaults.adapter = async config => response(config, 'not json');
        await expect(getDashboard(period)).rejects.toMatchObject({ kind: 'server' });
        api.defaults.adapter = config => Promise.reject(new AxiosError('Unauthorized', '', config, undefined, response(config, '', 401)));
        await expect(getDashboard(period)).rejects.toMatchObject({ kind: 'auth' }); expect(localStorage.getItem('accessToken')).toBeNull();
    });
    it.each([200, 401])('discards old-session %s without expiring replacement session', async status => {
        let complete!: () => void; let start!: () => void; const ready = new Promise<void>(resolve => { start = resolve; });
        api.defaults.adapter = config => new Promise((resolve, reject) => {
            complete = () => status === 200 ? resolve(response(config, json())) : reject(new AxiosError('Unauthorized', '', config, undefined, response(config, '', status))); start();
        });
        const pending = getDashboard(period).catch(error => error); await ready;
        const token = makeToken(undefined, 'replacement@example.com'); loginSession(token); complete();
        expect(await pending).toMatchObject({ code: 'ERR_CANCELED' }); expect(localStorage.getItem('accessToken')).toBe(token);
    });
});
