import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { loginSession, logoutSession } from '../../api/session';
import { makeToken } from '../../test/session';
import { ApiError } from '../../api/errors';
import { getDashboard } from '../../services/dashboardService';
import { getCategoryBreakdown } from '../../services/analyticsService';
import { dashboard, categories } from './fixtures';
import type { DashboardResponse } from '../../types/dashboard';
import type { CategoriesResponse } from '../../types/analytics';

vi.mock('../../services/dashboardService'); vi.mock('../../services/analyticsService');
vi.mock('./IncomeExpenseChart', async importOriginal => ({ ...await importOriginal<typeof import('./IncomeExpenseChart')>(), AmountChart: () => <div aria-hidden="true" />,
    default: () => <h2>Income vs expense</h2> }));
function Location() { const location = useLocation(); const navigate = useNavigate(); return <><span data-testid="location">{location.pathname + location.search + location.hash}</span><button onClick={() => navigate(-1)}>Browser back</button><button onClick={() => navigate(1)}>Browser forward</button></>; }
function setup(path = '/app/dashboard?year=2026&month=10') { return render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /><Location /></AuthProvider></MemoryRouter>); }
beforeEach(() => {
    vi.resetAllMocks(); localStorage.clear(); vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 10)); loginSession(makeToken(Math.floor(new Date(2028, 0, 1).getTime() / 1000)));
    vi.mocked(getDashboard).mockResolvedValue(dashboard); vi.mocked(getCategoryBreakdown).mockResolvedValue(categories);
});
afterEach(() => { cleanup(); logoutSession(); vi.useRealTimers(); vi.restoreAllMocks(); });
const overview = () => screen.getByRole('region', { name: 'Financial overview for October 2026' });
async function loaded() { await screen.findByRole('region', { name: 'Financial overview for October 2026' }); }

describe('Dashboard financial overview and previews', () => {
    it('renders exact scoped figures, historical names, Long links and read-only summaries', async () => {
        setup(); await loaded();
        expect(within(overview()).getByText('-₹1,99,99,99,99,99,99,99,999.98')).toBeInTheDocument();
        expect(within(overview()).getByText('₹99,99,99,99,99,99,99,999.99')).toBeInTheDocument();
        expect(within(overview()).getByText('-₹0.01')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Income vs expense' })).toBeNull();
        expect(screen.getByRole('link', { name: 'Outside selected month' })).toHaveAttribute('href', '/app/transactions/9223372036854775807');
        expect(screen.getByText('2026-09-01')).toBeInTheDocument();

        const budgets = screen.getByRole('region', { name: 'Budget summary' });
        expect(within(budgets).getByText('₹10.00')).toBeInTheDocument(); expect(within(budgets).getByText('1')).toBeInTheDocument();
        expect(within(budgets).getByRole('link', { name: 'View budgets' })).toHaveAttribute('href', '/app/budgets?year=2026&month=10');
        const pending = screen.getByRole('region', { name: 'Pending recurring transactions' });
        expect(within(pending).getByText(/Pacific\/Kiritimati/)).toHaveTextContent('As of 2026-10-10 through 2026-11-09');
        expect(within(pending).getByText('BLOCKED · Overdue')).toBeInTheDocument();
        expect(within(pending).getByText('ACTIVE')).toBeInTheDocument(); expect(within(pending).queryByText(/Blocked reason:/)).toBeNull();
        expect(within(pending).getByRole('link', { name: 'View recurring rules' })).toHaveAttribute('href', '/app/recurring');
        dashboard.pendingRecurringTransactions.items.forEach(item => expect(within(pending).getByRole('link', { name: item.description || `${item.type} recurring transaction` })).toHaveAttribute('href', `/app/recurring/${item.id}`));
        expect(screen.queryByRole('link', { name: /Manage|Forecast/ })).toBeNull();
        expect(screen.getByRole('link', { name: 'View analytics' })).toHaveAttribute('href', '/app/analytics?from=2026-10-01&to=2026-10-31&grouping=DAILY');
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('heading', { name: 'Monthly Cash Flow' })).toBeInTheDocument();
        expect(screen.getByText('Money In')).toBeInTheDocument(); expect(screen.getByText('Money Out')).toBeInTheDocument();
        expect(screen.queryByText('Invested')).toBeNull();
        expect(screen.getAllByRole('main')).toHaveLength(1); expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });
    it('keeps distinct category IDs, inactive history and only expense groups', async () => {
        setup(); const list = await screen.findByRole('list', { name: 'Expense categories for October 2026' });
        expect(within(list).getAllByRole('listitem')).toHaveLength(2);
        expect(within(list).getAllByRole('link', { name: 'Same name' })[1]).toHaveAttribute('href', '/app/transactions?type=EXPENSE&categoryId=9007199254740995&from=2026-10-01&to=2026-10-31&page=0');
        expect(within(list).getAllByRole('link', { name: 'Same name' })[0]).toHaveAttribute('href', '/app/transactions?type=EXPENSE&categoryId=9223372036854775807&from=2026-10-01&to=2026-10-31&page=0');
        expect(list.querySelectorAll('.ct-spending-bar')).toHaveLength(2); expect(within(list).queryByText('Income category')).toBeNull();
        expect(list.querySelectorAll('.ct-category-icon')).toHaveLength(2);
    });
    it('renders zero values without inferring no accounts and uses independent empty states', async () => {
        vi.mocked(getDashboard).mockResolvedValue({ ...dashboard, totalActiveAccountBalance: '0', monthlySummary: { income: '0', expense: '0', netCashFlow: '0' },
            budgetSummary: { budgetCount: '0', totalBudgetAmount: '0', spentOnBudgetedCategories: '0', remainingBudgetAmount: '0', overBudgetCount: '0' }, recentTransactions: [], pendingRecurringTransactions: { ...dashboard.pendingRecurringTransactions, items: [] } });
        vi.mocked(getCategoryBreakdown).mockResolvedValue({ ...categories, items: [] });
        setup(); await loaded(); expect(within(overview()).getAllByText('₹0.00')).toHaveLength(4);
        for (const title of ['No recent transactions', 'No budgets for this month', 'No pending recurring transactions', 'No category spending']) expect(await screen.findByText(title)).toBeInTheDocument();
        expect(screen.queryByText(/No accounts/)).toBeNull(); expect(screen.getByText(/Pacific\/Kiritimati/)).toBeInTheDocument();
    });
    it.each(['income', 'expense'] as const)('accepts an %s-only month and budgets absent despite activity', async kind => {
        vi.mocked(getDashboard).mockResolvedValue({ ...dashboard, monthlySummary: { income: kind === 'income' ? '0.01' : '0', expense: kind === 'expense' ? '0.01' : '0', netCashFlow: kind === 'income' ? '0.01' : '-0.01' }, budgetSummary: { ...dashboard.budgetSummary, budgetCount: '0' } });
        setup(); await loaded(); expect(screen.getByText('No budgets for this month')).toBeInTheDocument();
        expect(within(overview()).getAllByText('₹0.00')).toHaveLength(1);
    });
    it('retains signed negative remaining and a blocked reason', async () => {
        vi.mocked(getDashboard).mockResolvedValue({ ...dashboard, budgetSummary: { ...dashboard.budgetSummary, remainingBudgetAmount: '-20' }, pendingRecurringTransactions: { ...dashboard.pendingRecurringTransactions,
            items: [{ ...dashboard.pendingRecurringTransactions.items[0], blockedReason: 'ACCOUNT_INACTIVE' }] } });
        setup(); await loaded(); expect(screen.getByText('-₹20.00 · Over budget')).toBeInTheDocument(); expect(screen.getByText('Blocked reason: ACCOUNT_INACTIVE')).toBeInTheDocument();
    });
    it('preserves complete long reference names and a 500-character description', async () => {
        const name = 'N'.repeat(100); const description = 'D'.repeat(500);
        vi.mocked(getDashboard).mockResolvedValue({ ...dashboard, recentTransactions: [{ ...dashboard.recentTransactions[0], description, accountName: name, categoryName: name }] });
        setup(); await loaded(); expect(screen.getByRole('link', { name: description })).toHaveTextContent(description);
        expect(screen.getByText(`Account: ${name}`)).toBeInTheDocument(); expect(screen.getByText(`Category: ${name}`)).toBeInTheDocument();
    });
});

describe('total balance visibility', () => {
    it('shows by default, masks only the balance and remembers Hide and Show on this device', async () => {
        const view = setup(); await loaded();
        const amount = document.getElementById('total-balance-amount')!;
        const actual = amount.textContent;
        expect(actual).toContain('999.98');
        await userEvent.click(screen.getByRole('button', { name: 'Hide total balance' }));
        expect(amount).toHaveTextContent('\u20b9 \u2022\u2022\u2022\u2022\u2022\u2022');
        expect(within(overview()).getByText('-\u20b90.01')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Outside selected month' })).toBeInTheDocument();
        view.unmount(); const restored = setup(); await loaded();
        expect(document.getElementById('total-balance-amount')).toHaveTextContent('\u20b9 \u2022\u2022\u2022\u2022\u2022\u2022');
        await userEvent.click(screen.getByRole('button', { name: 'Show total balance' }));
        expect(document.getElementById('total-balance-amount')?.textContent).toBe(actual);
        restored.unmount(); setup(); await loaded();
        expect(screen.getByRole('button', { name: 'Hide total balance' })).toBeInTheDocument();
        expect(document.getElementById('total-balance-amount')?.textContent).toBe(actual);
    });
    it('keeps the balance toggle usable when localStorage is unavailable', async () => {
        const get = Storage.prototype.getItem; const set = Storage.prototype.setItem;
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
            if (key === 'cointrail.dashboard.balanceHidden') throw new Error('Storage unavailable');
            return get.call(this, key);
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
            if (key === 'cointrail.dashboard.balanceHidden') throw new Error('Storage unavailable');
            set.call(this, key, value);
        });
        setup(); await loaded(); await userEvent.click(screen.getByRole('button', { name: 'Hide total balance' }));
        expect(screen.getByRole('button', { name: 'Show total balance' })).toBeInTheDocument();
    });
});

describe('current-month dashboard and request lifecycle', () => {
    it('uses the current month even with historical or invalid reporting parameters, preserving navigation metadata', async () => {
        setup('/app/dashboard?year=10000&month=0&source=review#budget-summary-heading'); await loaded();
        expect(getDashboard).toHaveBeenCalledWith({ year: '2026', month: '10' }, expect.any(AbortSignal));
        expect(getCategoryBreakdown).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-31' }, expect.any(AbortSignal));
        expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard?year=10000&month=0&source=review#budget-summary-heading');
        expect(screen.queryByRole('form', { name: 'Reporting period' })).toBeNull();
        expect(screen.queryByLabelText('Reporting month')).toBeNull(); expect(screen.queryByLabelText('Reporting year')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Apply period' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Current month' })).toBeNull();
    });
    it('rolls reports forward on focus without fetching unchanged months', async () => {
        vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59)); loginSession(makeToken());
        setup('/app/dashboard?year=2024&month=2');
        await screen.findByRole('region', { name: 'Financial overview for December 2026' });
        const oldSignal = vi.mocked(getDashboard).mock.calls.at(-1)![1]!;
        act(() => { vi.setSystemTime(new Date(2027, 0, 1)); window.dispatchEvent(new Event('focus')); });
        await screen.findByRole('region', { name: 'Financial overview for January 2027' });
        expect(oldSignal.aborted).toBe(true);
        const calls = vi.mocked(getDashboard).mock.calls.length;
        act(() => window.dispatchEvent(new Event('focus')));
        expect(getDashboard).toHaveBeenCalledTimes(calls);
        expect(screen.getByRole('button', { name: 'Refresh dashboard' })).not.toHaveAttribute('aria-busy');
    });
    it('refresh rechecks the current calendar immediately', async () => {
        vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59)); loginSession(makeToken());
        setup('/app/dashboard'); await screen.findByRole('region', { name: 'Financial overview for December 2026' });
        vi.setSystemTime(new Date(2027, 0, 1));
        fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
        await screen.findByRole('region', { name: 'Financial overview for January 2027' });
        expect(getDashboard).toHaveBeenCalledTimes(2); expect(getCategoryBreakdown).toHaveBeenCalledTimes(2);
        expect(getDashboard).toHaveBeenLastCalledWith({ year: '2027', month: '1' }, expect.any(AbortSignal));
        expect(screen.getByRole('link', { name: 'View analytics' })).toHaveAttribute('href', '/app/analytics?from=2027-01-01&to=2027-01-31&grouping=DAILY');
        expect(screen.getByRole('link', { name: 'View budgets' })).toHaveAttribute('href', '/app/budgets?year=2027&month=1');
    });
    it('keeps the local current month on the bare Dashboard URL', async () => {
        setup('/app/dashboard'); await loaded();
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/dashboard$/);
        expect(getDashboard).toHaveBeenCalledWith({ year: '2026', month: '10' }, expect.any(AbortSignal));
    });
    it('shows loading without financial zero placeholders', () => {
        vi.mocked(getDashboard).mockReturnValue(new Promise(() => {})); vi.mocked(getCategoryBreakdown).mockReturnValue(new Promise(() => {}));
        setup(); expect(screen.getByText('Loading dashboard…')).toBeInTheDocument(); expect(screen.getByText('Loading category spending…')).toBeInTheDocument(); expect(screen.queryByText('₹0.00')).toBeNull();
    });
    it.each(['dashboard', 'categories'])('retries %s independently while preserving the successful region', async failing => {
        if (failing === 'dashboard') vi.mocked(getDashboard).mockRejectedValueOnce(new ApiError('Overview unavailable', 'network'));
        else vi.mocked(getCategoryBreakdown).mockRejectedValueOnce(new ApiError('Categories unavailable', 'timeout'));
        setup(); await screen.findByRole('alert');
        if (failing === 'dashboard') expect(await screen.findByRole('list', { name: 'Expense categories for October 2026' })).toBeInTheDocument(); else await loaded();
        await userEvent.click(screen.getByRole('button', { name: 'Try again' })); await loaded();
        await screen.findByRole('list', { name: 'Expense categories for October 2026' });
        expect(getDashboard).toHaveBeenCalledTimes(failing === 'dashboard' ? 2 : 1); expect(getCategoryBreakdown).toHaveBeenCalledTimes(failing === 'categories' ? 2 : 1);
    });
    it('Refresh replaces both payloads with loading and ignores aborted previous attempts', async () => {
        let finishDashboard!: (data: DashboardResponse) => void; let finishCategories!: (data: CategoriesResponse) => void;
        vi.mocked(getDashboard).mockReturnValueOnce(new Promise(resolve => { finishDashboard = resolve; }));
        vi.mocked(getCategoryBreakdown).mockReturnValueOnce(new Promise(resolve => { finishCategories = resolve; }));
        setup(); expect(screen.getByRole('button', { name: 'Refresh dashboard' })).not.toHaveAttribute('aria-busy');
        const dashboardSignal = vi.mocked(getDashboard).mock.calls[0][1]!; const categorySignal = vi.mocked(getCategoryBreakdown).mock.calls[0][1]!;
        await userEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' })); await loaded();
        expect(dashboardSignal.aborted).toBe(true); expect(categorySignal.aborted).toBe(true);
        await act(async () => { finishDashboard({ ...dashboard, totalActiveAccountBalance: '123' }); finishCategories({ ...categories, items: [] }); });
        expect(screen.queryByText('₹123.00')).toBeNull(); expect(await screen.findByRole('list', { name: 'Expense categories for October 2026' })).toBeInTheDocument();
        vi.mocked(getDashboard).mockReturnValueOnce(new Promise(resolve => { finishDashboard = resolve; }));
        vi.mocked(getCategoryBreakdown).mockReturnValueOnce(new Promise(resolve => { finishCategories = resolve; }));
        await userEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
        expect(screen.getByRole('button', { name: 'Refresh dashboard' })).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByRole('button', { name: 'Refresh dashboard' }).querySelector('.ct-refresh-spinning')).not.toBeNull();
        expect(screen.queryByRole('region', { name: /Financial overview/ })).toBeNull(); expect(screen.getByText('Loading dashboard…')).toBeInTheDocument();
        await act(async () => finishDashboard(dashboard)); await loaded();
        expect(screen.getByRole('button', { name: 'Refresh dashboard' })).toHaveAttribute('aria-busy', 'true');
        await act(async () => finishCategories(categories));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh dashboard' })).not.toHaveAttribute('aria-busy'));
        expect(screen.getByRole('button', { name: 'Refresh dashboard' }).querySelector('.ct-refresh-spinning')).toBeNull();
    });
    it('discards out-of-order calendar responses and cancels both requests on unmount', async () => {
        let finish!: (data: DashboardResponse) => void;
        vi.mocked(getDashboard).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
        const view = setup(); const old = vi.mocked(getDashboard).mock.calls[0][1]!;
        act(() => { vi.setSystemTime(new Date(2026, 10, 1)); window.dispatchEvent(new Event('focus')); });
        await screen.findByRole('region', { name: 'Financial overview for November 2026' }); expect(old.aborted).toBe(true);
        await act(async () => finish({ ...dashboard, totalActiveAccountBalance: '123' })); expect(screen.queryByText('₹123.00')).toBeNull();
        const activeDashboard = vi.mocked(getDashboard).mock.calls.at(-1)![1]!; const activeCategories = vi.mocked(getCategoryBreakdown).mock.calls.at(-1)![1]!;
        view.unmount(); expect(activeDashboard.aborted).toBe(true); expect(activeCategories.aborted).toBe(true);
    });
    it('clears previous owner figures when the real session changes', async () => {
        setup(); await loaded(); vi.mocked(getDashboard).mockReturnValue(new Promise(() => {})); vi.mocked(getCategoryBreakdown).mockReturnValue(new Promise(() => {}));
        act(() => loginSession(makeToken(undefined, 'other@example.com')));
        expect(screen.queryByText('-₹1,99,99,99,99,99,99,99,999.98')).toBeNull(); expect(screen.getByText('Loading dashboard…')).toBeInTheDocument();
        act(() => logoutSession()); expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    });
});
