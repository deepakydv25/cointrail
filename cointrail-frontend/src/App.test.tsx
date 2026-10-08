import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import api from './api/axios';
import { loginSession, logoutSession } from './api/session';
import { makeToken } from './test/session';

vi.mock('./components/CategorySpendingChart', () => ({ default: () => <div>Legacy chart</div> }));
const originalAdapter = api.defaults.adapter;
const expense = { id: 7, amount: 12.34, category: 'FOOD', description: 'Legacy lunch', expenseDate: '2026-10-01', createdAt: '2026-10-01T12:00:00', updatedAt: '2026-10-01T12:00:00' };
const response = (config: InternalAxiosRequestConfig, data: unknown): AxiosResponse => ({ config, data, status: 200, statusText: '', headers: new AxiosHeaders() });
function Location() { const location = useLocation(); return <span data-testid="location">{location.pathname + location.search}</span>; }
const renderApp = (path: string) => render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /><Location /></AuthProvider></MemoryRouter>);

beforeEach(() => {
    logoutSession();
    api.defaults.adapter = async config => {
        if (config.url === '/api/v1/auth/login') return response(config, { accessToken: makeToken(), tokenType: 'Bearer' });
        if (config.url === '/api/v1/expenses/summary') return response(config, { totalAmount: 12.34, totalExpenses: 1, categoryBreakdown: { FOOD: 12.34 } });
        if (config.url === '/api/v1/expenses') return response(config, { content: [expense], number: 0, size: 5, totalElements: 1, totalPages: 1 });
        return response(config, expense);
    };
});
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter; logoutSession(); vi.restoreAllMocks(); });

describe('foundation app navigation with real session and transport', () => {
    it.each(['/dashboard', '/expenses', '/expenses/create', '/expenses/7', '/expenses/7/edit', '/app/accounts'])('protects existing and V2 namespace route %s', async path => {
            renderApp(path);
            expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
            expect(screen.getByTestId('location')).toHaveTextContent('/login');
        });

    it('returns to a legacy edit deep link and keeps its search after login', async () => {
        const user = userEvent.setup(); renderApp('/expenses/7/edit?source=legacy');
        await user.type(await screen.findByLabelText('Email'), 'owner@example.com');
        await user.type(screen.getByLabelText('Password'), 'password123');
        await user.click(screen.getByRole('button', { name: 'Login' }));
        expect(await screen.findByRole('heading', { name: 'Edit Expense' })).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toHaveValue('Legacy lunch');
        expect(screen.getByTestId('location')).toHaveTextContent('/expenses/7/edit?source=legacy');
    });

    it('keeps the ordinary authenticated default on /dashboard', async () => {
        loginSession(makeToken()); renderApp('/login');
        expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
        expect(screen.getByRole('link', { name: 'Legacy Overview' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'Legacy Expenses' })).toHaveAttribute('href', '/expenses');
    });

    it('reserves /app without advertising unimplemented screens', async () => {
        loginSession(makeToken()); renderApp('/app/accounts');
        expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main-content');
    });

    it('redirects once with an expiry notice after a protected bodyless 401', async () => {
        loginSession(makeToken());
        api.defaults.adapter = config => Promise.reject(new AxiosError('Unauthorized', '', config, undefined, { ...response(config, ''), status: 401 }));
        renderApp('/expenses');
        expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Your session expired');
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(screen.queryByText('Legacy lunch')).not.toBeInTheDocument();
    });

    it('removes protected content on cross-tab logout and reflects the real session on the landing page', async () => {
        loginSession(makeToken()); renderApp('/expenses');
        await screen.findByText('Legacy lunch');
        act(() => {
            localStorage.removeItem('accessToken');
            window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }));
        });
        expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
        expect(screen.queryByText('Legacy lunch')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('link', { name: 'CoinTrail home' }));
        expect(await screen.findByRole('link', { name: 'Get Started' })).toBeInTheDocument();
    });

    it('clears old page data when another tab replaces the session', async () => {
        loginSession(makeToken()); renderApp('/expenses');
        await screen.findByText('Legacy lunch');
        api.defaults.adapter = async config => response(config, {
            content: [{ ...expense, description: 'Other owner record' }], number: 0, size: 5, totalElements: 1, totalPages: 1,
        });
        act(() => {
            localStorage.setItem('accessToken', makeToken(undefined, 'other@example.com'));
            window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }));
        });
        expect(screen.queryByText('Legacy lunch')).not.toBeInTheDocument();
        expect(await screen.findByText('Other owner record')).toBeInTheDocument();
    });

    it('focuses the route heading and closes mobile navigation after navigation', async () => {
        loginSession(makeToken()); renderApp('/dashboard');
        await screen.findByRole('heading', { name: 'Dashboard' });
        fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation menu' }));
        fireEvent.click(screen.getByRole('link', { name: 'Legacy Expenses' }));
        const heading = await screen.findByRole('heading', { name: 'Expenses' });
        await waitFor(() => expect(heading).toHaveFocus());
        expect(screen.getByRole('button', { name: 'Toggle navigation menu' })).toHaveAttribute('aria-expanded', 'false');
    });
});
