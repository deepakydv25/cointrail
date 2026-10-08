import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import api, { createApiClient } from './axios';
import { getSessionSnapshot, loginSession, logoutSession } from './session';
import { makeToken } from '../test/session';
import { loginUser, registerUser } from '../services/authService';
import { createExpense, deleteExpense, getExpenseById, getExpenses, getExpenseSummary, updateExpense } from '../services/expenseService';

const response = (config: InternalAxiosRequestConfig, data: unknown = {}, status = 200): AxiosResponse =>
    ({ config, data, status, statusText: '', headers: new AxiosHeaders() });
const rejectHttp = (config: InternalAxiosRequestConfig, status: number, data: unknown = '') =>
    Promise.reject(new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, response(config, data, status)));

beforeEach(() => logoutSession());
afterEach(() => { logoutSession(); vi.restoreAllMocks(); });

describe('shared transport', () => {
    it('supports exact V1 auth/expense and V2 routes under a normalized base', async () => {
        const client = createApiClient('https://api.example.com/prefix/api/v1/');
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config));
        client.defaults.adapter = adapter;
        loginSession(makeToken());
        await client.post('/api/v1/auth/login', {});
        await client.get('/api/v1/expenses');
        await client.get('/api/accounts');
        expect(adapter.mock.calls.map(([config]) => client.getUri(config))).toEqual([
            'https://api.example.com/prefix/api/v1/auth/login',
            'https://api.example.com/prefix/api/v1/expenses', 'https://api.example.com/prefix/api/accounts',
        ]);
        expect(adapter.mock.calls[0][0].headers.has('Authorization')).toBe(false);
        expect(adapter.mock.calls[1][0].headers.get('Authorization')).toBe(`Bearer ${getSessionSnapshot().token}`);
        expect(adapter.mock.calls[2][0].timeout).toBe(15_000);
    });

    it('preserves every V1 service method, payload, raw response and query', async () => {
        const identity = { id: 1, name: 'Owner', email: 'owner@example.com', role: 'USER' };
        const credentials = { accessToken: makeToken(), tokenType: 'Bearer' };
        const expense = { amount: 12.34, category: 'FOOD' as const, description: 'Lunch', expenseDate: '2026-10-01' };
        const expenseResponse = { ...expense, id: 7, createdAt: '2026-10-01T12:00:00', updatedAt: '2026-10-01T12:00:00' };
        const page = { content: [expenseResponse], number: 1, size: 5, totalElements: 6, totalPages: 2 };
        const summary = { totalAmount: 12.34, totalExpenses: 1, categoryBreakdown: { FOOD: 12.34 } };
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            if (config.url === '/api/v1/auth/register') return response(config, identity, 201);
            if (config.url === '/api/v1/auth/login') return response(config, credentials);
            if (config.url === '/api/v1/expenses') return response(config, page);
            if (config.url === '/api/v1/expenses/summary') return response(config, summary);
            if (config.method === 'delete') return response(config, '', 204);
            return response(config, expenseResponse, config.method === 'post' ? 201 : 200);
        });
        const original = api.defaults.adapter;
        api.defaults.adapter = adapter;
        try {
            expect(await registerUser({ name: 'Owner', email: identity.email, password: 'password123' })).toEqual(identity);
            expect(await loginUser({ email: identity.email, password: 'password123' })).toEqual(credentials);
            expect(getSessionSnapshot().token).toBeNull(); // Neither service establishes a session.
            loginSession(makeToken());
            expect(await getExpenses(1, 5, 'amount', 'asc', 'FOOD')).toEqual(page);
            expect(await createExpense(expense)).toEqual(expenseResponse);
            expect(await getExpenseById(7)).toEqual(expenseResponse);
            expect(await updateExpense(7, expense)).toEqual(expenseResponse);
            expect(await deleteExpense(7)).toBeUndefined();
            expect(await getExpenseSummary()).toEqual(summary);
            expect(adapter.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
                ['post', '/api/v1/auth/register'], ['post', '/api/v1/auth/login'], ['get', '/api/v1/expenses'],
                ['post', '/api/v1/expenses/create'], ['get', '/api/v1/expenses/7'], ['put', '/api/v1/expenses/7'],
                ['delete', '/api/v1/expenses/7'], ['get', '/api/v1/expenses/summary'],
            ]);
            expect(adapter.mock.calls[2][0].params).toEqual({ page: 1, size: 5, sort: 'amount,asc', category: 'FOOD' });
            expect(JSON.parse(adapter.mock.calls[3][0].data)).toEqual(expense);
            expect(JSON.parse(adapter.mock.calls[5][0].data)).toEqual(expense);
        } finally { api.defaults.adapter = original; }
    });

    it('expires a protected session once on bodyless 401', async () => {
        loginSession(makeToken());
        const client = createApiClient('https://api.example.com');
        client.defaults.adapter = config => rejectHttp(config, 401);
        await expect(client.get('/api/accounts')).rejects.toMatchObject({ kind: 'auth', status: 401 });
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(getSessionSnapshot().expired).toBe(true);
    });

    it('leaves the session intact on login 401 and protected 403', async () => {
        loginSession(makeToken());
        const session = getSessionSnapshot();
        const client = createApiClient('https://api.example.com');
        client.defaults.adapter = config => rejectHttp(config, config.url?.includes('/auth/') ? 401 : 403, { message: 'Unavailable', errors: null });
        await expect(client.post('/api/v1/auth/login', {})).rejects.toMatchObject({ kind: 'auth', message: 'Unavailable' });
        await expect(client.get('/api/accounts')).rejects.toMatchObject({ kind: 'forbidden' });
        expect(getSessionSnapshot()).toEqual(session);
    });

    it.each(['401', 'success'])('discards an old session response (%s) after a new login', async outcome => {
        loginSession(makeToken());
        const client = createApiClient('https://api.example.com');
        let complete!: () => void;
        let started!: () => void;
        const ready = new Promise<void>(resolve => { started = resolve; });
        client.defaults.adapter = config => new Promise((resolve, reject) => {
            complete = () => outcome === '401' ? reject(new AxiosError('Unauthorized', '', config, undefined, response(config, '', 401))) : resolve(response(config, { private: true }));
            started();
        });
        const pending = client.get('/api/accounts').catch(error => error);
        await ready;
        const newToken = makeToken(undefined, 'new@example.com'); loginSession(newToken);
        complete();
        expect(axios.isCancel(await pending)).toBe(true);
        expect(getSessionSnapshot().token).toBe(newToken);
    });

    it('honors cancellation without normalizing it or expiring the session', async () => {
        loginSession(makeToken());
        const client = createApiClient('https://api.example.com');
        client.defaults.adapter = () => Promise.reject(new CanceledError());
        await expect(client.get('/api/accounts')).rejects.toSatisfy(axios.isCancel);
        const controller = new AbortController(); controller.abort();
        await expect(client.get('/api/accounts', { signal: controller.signal })).rejects.toSatisfy(axios.isCancel);
        expect(getSessionSnapshot().token).not.toBeNull();
    });

    it.each(['https://evil.example/api/accounts', '//evil.example/api/accounts', '/api/\\evil'])('rejects unsafe request %s before dispatch', async path => {
        loginSession(makeToken());
        const client = createApiClient('https://api.example.com');
        const adapter = vi.fn(); client.defaults.adapter = adapter;
        await expect(client.get(path)).rejects.toMatchObject({ kind: 'server' });
        expect(adapter).not.toHaveBeenCalled();
    });

    it('does not dispatch protected requests without a valid token', async () => {
        const client = createApiClient('https://api.example.com');
        const adapter = vi.fn(); client.defaults.adapter = adapter;
        localStorage.setItem('accessToken', makeToken(1));
        await expect(client.get('/api/accounts')).rejects.toMatchObject({ kind: 'auth' });
        expect(adapter).not.toHaveBeenCalled();
        expect(localStorage.getItem('accessToken')).toBeNull();
    });
});
