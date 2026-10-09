import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import api from '../api/axios';
import { loginSession, logoutSession } from '../api/session';
import { makeToken } from '../test/session';
import { getAccountBreakdown, getAnalyticsComparison, getAnalyticsSummary, getAnalyticsTrends, getCategoryBreakdown } from './analyticsService';

const originalAdapter = api.defaults.adapter;
const range = { from: '2024-02-01', to: '2024-02-29' };
const json = '{"range":{"from":"2024-02-01","to":"2024-02-29","dayCount":29},"totals":{"income":0,"expense":199999999999999999.98,"netCashFlow":-199999999999999999.98,"transactionCount":9007199254740993},"items":[{"categoryId":9223372036854775807,"categoryName":"Historical","categoryType":"EXPENSE","system":false,"active":false,"totals":{"income":0,"expense":199999999999999999.98,"netCashFlow":-199999999999999999.98,"transactionCount":9007199254740993}}]}';
const response = (config: InternalAxiosRequestConfig, data: string, status = 200) => ({ config, data, status, statusText: '', headers: new AxiosHeaders() });
beforeEach(() => loginSession(makeToken()));
afterEach(() => { api.defaults.adapter = originalAdapter; logoutSession(); vi.restoreAllMocks(); });
describe('narrow dashboard category contract', () => {
    it('sends exact inclusive dates/path/signal and preserves aggregate/count/ID metadata', async () => {
        const signal = new AbortController().signal;
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, json)); api.defaults.adapter = adapter;
        expect(await getCategoryBreakdown(range, signal)).toMatchObject({ range: { ...range, dayCount: '29' }, totals: { expense: '199999999999999999.98', transactionCount: '9007199254740993' },
            items: [{ categoryId: '9223372036854775807', active: false, system: false, totals: { netCashFlow: '-199999999999999999.98' } }] });
        const config = adapter.mock.calls[0][0]; expect(config).toMatchObject({ url: '/api/analytics/categories', method: 'get', params: range, signal });
        expect(Object.fromEntries(new URL(api.getUri(config)).searchParams)).toEqual(range); expect(config.data).toBeUndefined();
        expect(config.headers.get('Authorization')).toBe(`Bearer ${localStorage.getItem('accessToken')}`);
    });
    it.each([{ from: '2026-02-30', to: '2026-03-01' }, { from: '0000-01-01', to: '0001-01-01' }, { from: '2026-10-02', to: '2026-10-01' }])('rejects invalid range %j before dispatch', async range => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(getCategoryBreakdown(range)).rejects.toMatchObject({ kind: 'validation' }); expect(adapter).not.toHaveBeenCalled();
    });
    it.each([400, 404, 500])('retains server authoritative %s', async status => {
        api.defaults.adapter = config => Promise.reject(new AxiosError('Failed', '', config, undefined, response(config, '{"message":"Rejected"}', status)));
        await expect(getCategoryBreakdown(range)).rejects.toMatchObject({ status });
    });
    it('discards aborted and previous-session category results', async () => {
        const controller = new AbortController(); controller.abort();
        await expect(getCategoryBreakdown(range, controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
        let complete!: () => void; let start!: () => void; const ready = new Promise<void>(resolve => { start = resolve; });
        api.defaults.adapter = config => new Promise(resolve => { complete = () => resolve(response(config, json)); start(); });
        const pending = getCategoryBreakdown(range).catch(error => error); await ready; loginSession(makeToken(undefined, 'other@example.com')); complete();
        expect(await pending).toMatchObject({ code: 'ERR_CANCELED' });
    });
});

const operations = [
    { path: 'summary', run: (signal?: AbortSignal) => getAnalyticsSummary(range, signal), params: range },
    { path: 'categories', run: (signal?: AbortSignal) => getCategoryBreakdown(range, signal), params: range },
    { path: 'accounts', run: (signal?: AbortSignal) => getAccountBreakdown(range, signal), params: range },
    { path: 'trends', run: (signal?: AbortSignal) => getAnalyticsTrends(range, 'WEEKLY', signal), params: { ...range, grouping: 'WEEKLY' } },
    { path: 'comparison', run: (signal?: AbortSignal) => getAnalyticsComparison(range, { from: '0001-01-01', to: '0001-01-01' }, signal), params: { ...range, compareFrom: '0001-01-01', compareTo: '0001-01-01' } },
];
describe('all five analytics transports', () => {
    it.each(operations)('sends only approved query/path and exact numeric responses for$path', async operation => {
        const signal = new AbortController().signal;
        const money = '{"income":99999999999999999.99,"expense":199999999999999999.98,"netCashFlow":-99999999999999999.99,"transactionCount":9007199254740993}';
        const summary = `{"range":{"from":"2024-02-01","to":"2024-02-29","dayCount":29},"totals":${money}}`;
        const data = operation.path === 'comparison' ? `{"current":${summary},"baseline":${summary},"delta":{"income":0.01,"expense":0,"netCashFlow":-0.01,"transactionCount":-9007199254740993}}` :
            operation.path === 'accounts' ? summary.slice(0, -1) + `,"items":[{"accountId":9223372036854775807,"accountName":"Historical","accountType":"CASH","active":false,"totals":${money}}]}` :
                operation.path === 'trends' ? summary.slice(0, -1) + `,"grouping":"WEEKLY","items":[{"from":"2024-02-01","to":"2024-02-04","totals":${money}}]}` : operation.path === 'categories' ? json : summary;
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, data)); api.defaults.adapter = adapter;
        const result = await operation.run(signal);
        expect(result).toMatchObject(operation.path === 'comparison' ? { current: { totals: { income: '99999999999999999.99' } }, delta: { income: '0.01', expense: '0', netCashFlow: '-0.01', transactionCount: '-9007199254740993' } } : { range: { dayCount: '29' }, totals: { expense: '199999999999999999.98', transactionCount: '9007199254740993' } });
        if (operation.path === 'accounts') expect(result).toMatchObject({ items: [{ accountId: '9223372036854775807', active: false }] });
        if (operation.path === 'trends') expect(result).toMatchObject({ items: [{ from: '2024-02-01', to: '2024-02-04', totals: { netCashFlow: '-99999999999999999.99' } }] });
        const config = adapter.mock.calls[0][0]; expect(config).toMatchObject({ url: `/api/analytics/${operation.path}`, method: 'get', signal, responseType: 'text', params: operation.params });
        expect(Object.fromEntries(new URL(api.getUri(config)).searchParams)).toEqual(operation.params); expect(config.data).toBeUndefined();
        expect(config.headers.get('Authorization')).toBe(`Bearer ${localStorage.getItem('accessToken')}`);
    });
    it('strips unsupported caller fields rather than leaking filters/baseline into requests', async () => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, json)); api.defaults.adapter = adapter;
        await getCategoryBreakdown({ ...range, accountId: '1', compareFrom: '2020-01-01' } as typeof range);
        expect(adapter.mock.calls[0][0].params).toEqual(range);
    });
    it.each(operations)('rejects cancelled reads and stale sessions for$path', async operation => {
        const controller = new AbortController(); controller.abort(); await expect(operation.run(controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
        let start!: () => void; let finish!: () => void; const ready = new Promise<void>(resolve => { start = resolve; });
        api.defaults.adapter = config => new Promise(resolve => { finish = () => resolve(response(config, json)); start(); });
        const pending = operation.run().catch(error => error); await ready; loginSession(makeToken(undefined, 'replacement@example.com')); finish();
        expect(await pending).toMatchObject({ code: 'ERR_CANCELED' });
    });
    it.each([400, 403, 404, 409, 500])('preserves normalized%s on new summary transport', async status => {
        api.defaults.adapter = config => Promise.reject(new AxiosError('Failed', '', config, undefined, response(config, '{"message":"Rejected","errors":{"from":"Invalid start"}}', status)));
        await expect(getAnalyticsSummary(range)).rejects.toMatchObject({ status, fieldErrors: { from: 'Invalid start' } });
    });
    it.each([['ECONNABORTED', 'timeout'], ['ETIMEDOUT', 'timeout'], ['ERR_NETWORK', 'network']])('normalizes%s without retries', async (code, kind) => {
        const adapter = vi.fn((config: InternalAxiosRequestConfig) => Promise.reject(new AxiosError('Failed', code, config))); api.defaults.adapter = adapter;
        await expect(getAnalyticsSummary(range)).rejects.toMatchObject({ kind }); expect(adapter).toHaveBeenCalledOnce();
    });
    it('handles bodyless401 using existing session expiration', async () => {
        api.defaults.adapter = config => Promise.reject(new AxiosError('Unauthorized', '', config, undefined, response(config, '', 401)));
        await expect(getAnalyticsSummary(range)).rejects.toMatchObject({ status: 401 }); expect(localStorage.getItem('accessToken')).toBeNull();
    });
    it('validates endpoint-specific limits and both comparison ranges before dispatch', async () => {
        const adapter = vi.fn(); api.defaults.adapter = adapter;
        await expect(getAnalyticsSummary({ from: '2024-02-29', to: '2029-02-28' })).rejects.toMatchObject({ kind: 'validation' });
        await expect(getAnalyticsTrends({ from: '2024-01-01', to: '2025-01-01' }, 'DAILY')).rejects.toMatchObject({ kind: 'validation' });
        await expect(getAnalyticsTrends({ from: '2024-02-29', to: '2026-02-28' }, 'WEEKLY')).rejects.toMatchObject({ kind: 'validation' });
        await expect(getAnalyticsComparison(range, { from: '2024-01-01', to: '2029-01-01' })).rejects.toMatchObject({ kind: 'validation' });
        await expect(getAnalyticsComparison({ from: '0000-01-01', to: range.to }, range)).rejects.toMatchObject({ kind: 'validation' });
        expect(adapter).not.toHaveBeenCalled();
    });
});
