import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import api from '../api/axios';
import { loginSession, logoutSession } from '../api/session';
import { makeToken } from '../test/session';
import { getCategoryBreakdown } from './analyticsService';

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
