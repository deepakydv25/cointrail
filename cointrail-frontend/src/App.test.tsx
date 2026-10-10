import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const accountJson = '{"id":9007199254740993,"name":"V2 Savings","type":"BANK","openingBalance":99999999999999999.99,"active":true,"createdAt":"2026-10-01T12:00:00","updatedAt":"2026-10-01T12:00:00"}';
const response = (config: InternalAxiosRequestConfig, data: unknown): AxiosResponse => ({ config, data, status: 200, statusText: '', headers: new AxiosHeaders() });
function Location() { const location = useLocation(); return <span data-testid="location">{location.pathname + location.search + location.hash}</span>; }
const renderApp = (path: string) => render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /><Location /></AuthProvider></MemoryRouter>);

beforeEach(() => {
    logoutSession();
    api.defaults.adapter = async config => {
        if (config.url === '/api/v1/auth/login') return response(config, { accessToken: makeToken(), tokenType: 'Bearer' });
        if (config.url === '/api/accounts') return response(config, `[${accountJson}]`);
        if (config.url === '/api/budgets') return response(config, '[]');
        if (config.url === '/api/recurring-transactions') return response(config, '{"content":[],"number":0,"size":20,"totalElements":0,"totalPages":0}');
        if (config.url === '/api/categories') return response(config, '[]');
        if (config.url === '/api/dashboard') return response(config, '{"year":2026,"month":10,"totalActiveAccountBalance":0,"monthlySummary":{"income":0,"expense":0,"netCashFlow":0},"budgetSummary":{"budgetCount":0,"totalBudgetAmount":0,"spentOnBudgetedCategories":0,"remainingBudgetAmount":0,"overBudgetCount":0},"recentTransactions":[],"pendingRecurringTransactions":{"asOfDate":"2026-10-09","throughDate":"2026-11-08","timezone":"UTC","items":[]}}');
        if (config.url === '/api/analytics/categories') return response(config, '{"range":{"from":"2026-10-01","to":"2026-10-31","dayCount":31},"totals":{"income":0,"expense":0,"netCashFlow":0,"transactionCount":0},"items":[]}');
        if (config.url?.startsWith('/api/analytics/')) {
            const report = { range: { from: config.params.from, to: config.params.to, dayCount: 29 }, totals: { income: 0, expense: 0, netCashFlow: 0, transactionCount: 0 } };
            return response(config, JSON.stringify(config.url.endsWith('/comparison') ? { current: report, baseline: { ...report, range: { ...report.range, from: config.params.compareFrom, to: config.params.compareTo } }, delta: report.totals } :
                config.url.endsWith('/trends') ? { ...report, grouping: config.params.grouping, items: [{ from: config.params.from, to: config.params.to, totals: report.totals }] } : config.url.endsWith('/accounts') ? { ...report, items: [] } : report));
        }
        if (config.url?.startsWith('/api/accounts/')) return response(config, accountJson);
        if (config.url === '/api/v1/expenses/summary') return response(config, { totalAmount: 12.34, totalExpenses: 1, categoryBreakdown: { FOOD: 12.34 } });
        if (config.url === '/api/v1/expenses') return response(config, { content: [expense], number: 0, size: 5, totalElements: 1, totalPages: 1 });
        return response(config, expense);
    };
});
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter; logoutSession(); vi.restoreAllMocks(); });

describe('foundation app navigation with real session and transport', () => {
    it.each(['/', '/login', '/register', '/unknown-public-page'])('shares public header geometry and brand on %s without requesting financial data', async path => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, {}));
        api.defaults.adapter = adapter;
        renderApp(path);
        await screen.findByRole('heading', { level: 1 });
        expect(screen.getByRole('banner')).toHaveClass('ct-public-header', 'ct-glass-header');
        const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
        expect(navigation).toHaveClass('ct-public-header-container');
        expect(within(navigation).getByRole('link', { name: 'CoinTrail home' })).toHaveTextContent(/^CoinTrail$/);
        expect(within(navigation).queryByRole('button', { name: /toggle navigation/i })).not.toBeInTheDocument();
        if (path === '/login' || path === '/register') {
            expect(within(screen.getByRole('main')).getByRole('button', { name: path === '/login' ? 'Login' : 'Register' })).toHaveClass('ct-button', 'ct-button--primary');
        }
        expect(adapter).not.toHaveBeenCalled();
    });
    it.each([false, true])('keeps landing public with no API calls when authenticated=%s', async authenticated => {
        if (authenticated) loginSession(makeToken());
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, {}));
        api.defaults.adapter = adapter;
        renderApp('/');
        expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Understand where your money goes.');
        expect(screen.getAllByRole('main')).toHaveLength(1);
        expect(document.querySelector('.ct-landing-header')).toBeInTheDocument();
        expect(document.querySelector('.ct-shell')).toBeNull();
        const header = within(screen.getByRole('navigation', { name: 'Primary navigation' }));
        expect(header.getByRole('link', { name: 'CoinTrail home' })).toHaveTextContent(/^CoinTrail$/);
        if (authenticated) expect(header.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
        else expect(header.queryByRole('button')).not.toBeInTheDocument();
        expect(header.queryByRole('link', { name: /features|how it works/i })).not.toBeInTheDocument();
        expect(adapter).not.toHaveBeenCalled();
        screen.getAllByRole('link', { name: authenticated ? 'Go to Dashboard' : 'Get Started' }).forEach(link => expect(link).toHaveAttribute('href', authenticated ? '/app/dashboard' : '/register'));
    });
    it('preserves classic auth layout and restores title when leaving landing', async () => {
        document.title = 'CoinTrail'; renderApp('/');
        await userEvent.click(within(screen.getByRole('region', { name: 'Understand where your money goes.' })).getByRole('link', { name: 'Sign In' }));
        expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
        expect(document.querySelector('.ct-landing-header')).toBeNull();
        expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
        expect(document.title).toBe('CoinTrail');
        expect(screen.getByText('Sign in to continue with CoinTrail.')).toBeInTheDocument();
        expect(screen.queryByText('Spend with intention')).not.toBeInTheDocument();
    });

    it('does not steal focus from a new-page control when heading focus is delayed', () => {
        const frames: FrameRequestCallback[] = [];
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
        loginSession(makeToken()); renderApp('/app/accounts/create');
        const name = screen.getByLabelText('Name'); name.focus();
        act(() => { frames.forEach(callback => callback(0)); });
        expect(name).toHaveFocus();
    });
    it.each(['/dashboard', '/app/accounts'])('logs out from %s to the public landing page and removes protected content', async path => {
        loginSession(makeToken()); renderApp(path);
        await screen.findByRole('heading', { level: 1 });
        await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
        expect(within(await screen.findByRole('main')).getByRole('link', { name: 'Get Started' })).toBeInTheDocument();
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(document.querySelector('.ct-shell')).toBeNull();
    });
    it.each(['/dashboard', '/expenses', '/expenses/create', '/expenses/7', '/expenses/7/edit',
        '/app/accounts', '/app/accounts/create', '/app/accounts/9007199254740993', '/app/accounts/9007199254740993/edit',
        '/app/categories', '/app/categories/create', '/app/categories/1', '/app/categories/1/edit',
        '/app/transactions', '/app/transactions/create', '/app/transactions/9007199254740993', '/app/transactions/9007199254740993/edit', '/app/dashboard?year=2026&month=10',
        '/app/budgets?year=2024&month=2', '/app/budgets/create', '/app/budgets/9223372036854775807', '/app/budgets/9223372036854775807/edit',
        '/app/recurring', '/app/recurring/create', '/app/recurring/9223372036854775807', '/app/recurring/9223372036854775807/edit', '/app/analytics?from=2024-02-01&to=2024-02-29&grouping=DAILY'])('protects existing and V2 namespace route %s', async path => {
            renderApp(path);
            expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
            expect(screen.getByTestId('location')).toHaveTextContent('/login');
        });

    it('returns to a legacy edit deep link and keeps its search after login', async () => {
        const user = userEvent.setup(); renderApp('/expenses/7/edit?source=legacy#description');
        await user.type(await screen.findByLabelText('Email'), 'owner@example.com');
        await user.type(screen.getByLabelText('Password'), 'password123');
        await user.click(screen.getByRole('button', { name: 'Login' }));
        expect(await screen.findByRole('heading', { name: 'Edit Expense' })).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toHaveValue('Legacy lunch');
        expect(screen.getByTestId('location')).toHaveTextContent('/expenses/7/edit?source=legacy#description');
    });

    it.each(['/login', '/register'])('uses the current Dashboard default from %s', async path => {
        loginSession(makeToken()); renderApp(path);
        expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/dashboard$/);
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'CoinTrail home' })).toHaveAttribute('href', '/');
        expect(screen.getByRole('link', { name: 'Expense records' })).toHaveAttribute('href', '/expenses');
    });

    it('returns to the Dashboard deep link after login without using V1 expense APIs', async () => {
        const original = api.defaults.adapter; const paths: string[] = [];
        api.defaults.adapter = async config => { paths.push(config.url!); return (original as (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>)(config); };
        const user = userEvent.setup(); renderApp('/app/dashboard?year=2026&month=10#budget-summary-heading');
        await user.type(await screen.findByLabelText('Email'), 'owner@example.com'); await user.type(screen.getByLabelText('Password'), 'password123');
        await user.click(screen.getByRole('button', { name: 'Login' }));
        expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        await screen.findByText('Total Balance');
        expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard?year=2026&month=10#budget-summary-heading');
        expect(paths).toContain('/api/dashboard'); expect(paths).toContain('/api/analytics/categories'); expect(paths.some(path => path.startsWith('/api/v1/expenses'))).toBe(false);
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    });

    it('redirects /app to the current Dashboard without period parameters', async () => {
        loginSession(makeToken()); renderApp('/app');
        expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument(); expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/dashboard$/);
    });

    it('preserves the explicit legacy dashboard and its legacy expense data', async () => {
        loginSession(makeToken()); renderApp('/dashboard');
        await screen.findByText('Legacy chart');
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/dashboard$/);
        expect(screen.getByRole('link', { name: 'Expense overview' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByText(/Legacy expense records remain available/)).toBeInTheDocument();
        expect(screen.queryByText('Total Balance')).toBeNull();
    });

    it('logs out to public home and defaults a fresh login to the current Dashboard', async () => {
        loginSession(makeToken()); renderApp('/expenses/7/edit?source=legacy');
        await screen.findByRole('heading', { name: 'Edit Expense' });
        fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
        await screen.findByRole('heading', { name: 'Understand where your money goes.' });
        fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('link', { name: 'Sign In' }));
        fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'owner@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));
        await screen.findByText('Total Balance');
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/dashboard$/);
    });

    it('reauthenticates an expired Dashboard session preserving its URL and hash', async () => {
        loginSession(makeToken());
        const original = api.defaults.adapter;
        api.defaults.adapter = config => Promise.reject(new AxiosError('Unauthorized', '', config, undefined, { ...response(config, ''), status: 401 }));
        const path = '/app/dashboard?year=2024&month=2#budget-summary-heading';
        renderApp(path);
        await screen.findByRole('heading', { name: 'Welcome Back' });
        expect(screen.getByRole('status')).toHaveTextContent('Your session expired');
        expect(screen.queryByText('Total Balance')).toBeNull();
        api.defaults.adapter = original;
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'owner@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));
        await screen.findByRole('region', { name: /^Financial overview for/ });
        expect(screen.getByTestId('location')).toHaveTextContent(path);
    });

    it('returns to an Analytics comparison deep link after login and calls only the five V2 analytics endpoints', async () => {
        const original = api.defaults.adapter; const paths: string[] = [];
        api.defaults.adapter = async config => { paths.push(config.url!); return (original as (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>)(config); };
        const path = '/app/analytics?from=2024-02-01&to=2024-02-29&grouping=MONTHLY&compareFrom=2023-02-01&compareTo=2023-02-28';
        renderApp(path); fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'owner@example.com' } }); fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Login' })); await screen.findByRole('heading', { name: 'Delta' });
        expect(screen.getByTestId('location')).toHaveTextContent(path);
        for (const endpoint of ['summary', 'categories', 'accounts', 'trends', 'comparison']) expect(paths).toContain(`/api/analytics/${endpoint}`);
        expect(paths.some(value => value.startsWith('/api/v1/expenses'))).toBe(false);
    });

    it('returns to a budget month deep link after login', async () => {
        const user = userEvent.setup(); renderApp('/app/budgets?year=2024&month=2');
        await user.type(await screen.findByLabelText('Email'), 'owner@example.com'); await user.type(screen.getByLabelText('Password'), 'password123');
        await user.click(screen.getByRole('button', { name: 'Login' })); await screen.findByText('No budgets for this month');
        expect(screen.getByTestId('location')).toHaveTextContent('/app/budgets?year=2024&month=2');
        expect(screen.getByRole('link', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page');
    });

    it('returns to a recurring filter deep link after login', async () => {
        const user = userEvent.setup(); renderApp('/app/recurring?status=BLOCKED&accountId=9007199254740993');
        await user.type(await screen.findByLabelText('Email'), 'owner@example.com'); await user.type(screen.getByLabelText('Password'), 'password123');
        await user.click(screen.getByRole('button', { name: 'Login' })); await screen.findByText('No matching recurring rules');
        expect(screen.getByTestId('location')).toHaveTextContent('/app/recurring?status=BLOCKED&accountId=9007199254740993');
        expect(screen.getByRole('link', { name: 'Recurring transactions' })).toHaveAttribute('aria-current', 'page');
    });

    it('returns to a V2 detail deep link after login with exact money and Long IDs', async () => {
        const user = userEvent.setup(); renderApp('/app/accounts/9007199254740993');
        await user.type(await screen.findByLabelText('Email'), 'owner@example.com');
        await user.type(screen.getByLabelText('Password'), 'password123');
        await user.click(screen.getByRole('button', { name: 'Login' }));
        expect(await screen.findByRole('heading', { name: 'V2 Savings' })).toBeInTheDocument();
        expect(screen.getByText(/Opening balance: ₹99,99,99,99,99,99,99,999.99/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Edit account' })).toHaveAttribute('href', '/app/accounts/9007199254740993/edit');
        expect(screen.getByTestId('location')).toHaveTextContent('/app/accounts/9007199254740993');
    });

    it('removes V2 data on cross-tab session replacement before loading the new owner', async () => {
        loginSession(makeToken()); renderApp('/app/accounts');
        await screen.findByRole('link', { name: 'V2 Savings' });
        api.defaults.adapter = async config => response(config, `[${accountJson.replace('V2 Savings', 'Other V2 owner')}]`);
        act(() => {
            localStorage.setItem('accessToken', makeToken(undefined, 'other@example.com'));
            window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }));
        });
        expect(screen.queryByRole('link', { name: 'V2 Savings' })).not.toBeInTheDocument();
        expect(await screen.findByRole('link', { name: 'Other V2 owner' })).toBeInTheDocument();
    });

    it('keeps unknown /app screens unavailable and advertises delivered resource screens', async () => {
        loginSession(makeToken()); renderApp('/app/unsupported');
        expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/app/dashboard');
        expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/app/accounts');
        expect(screen.getByRole('link', { name: 'Categories' })).toHaveAttribute('href', '/app/categories');
        expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/app/transactions');
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
        expect(within(await screen.findByRole('main')).getByRole('link', { name: 'Get Started' })).toBeInTheDocument();
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
        fireEvent.click(screen.getByRole('link', { name: 'Expense records' }));
        const heading = await screen.findByRole('heading', { name: 'Expenses' });
        await waitFor(() => expect(heading).toHaveFocus());
        expect(screen.getByRole('button', { name: 'Toggle navigation menu' })).toHaveAttribute('aria-expanded', 'false');
    });
});
