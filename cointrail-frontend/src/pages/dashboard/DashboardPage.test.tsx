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
    vi.resetAllMocks(); loginSession(makeToken());
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

describe('dashboard URL and request lifecycle', () => {
    it('preserves metadata/hash through Apply, reset and Back/Forward without duplicate history', async () => {
        setup('/app/dashboard?source=review&source=shared#budget-summary-heading');
        await screen.findByText('Total balance');
        fireEvent.change(screen.getByLabelText('Reporting year'), { target: { value: '2024' } });
        fireEvent.change(screen.getByLabelText('Reporting month'), { target: { value: '2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply period' }));
        const selected = '/app/dashboard?source=review&source=shared&year=2024&month=2#budget-summary-heading';
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(selected));
        fireEvent.click(screen.getByRole('button', { name: 'Apply period' }));
        fireEvent.click(screen.getByRole('button', { name: 'Current month' }));
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard?source=review&source=shared#budget-summary-heading'));
        fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
        await waitFor(() => expect(screen.getByLabelText('Reporting year')).toHaveValue(2024));
        expect(screen.getByTestId('location')).toHaveTextContent(selected);
        fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard?source=review&source=shared#budget-summary-heading'));
        fireEvent.click(screen.getByRole('button', { name: 'Browser forward' }));
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(selected));
    });
    it.each(['?year=2026', '?month=10', '?year=2026&year=2025&month=10', '?year=2026&month=10&month=11', '?year=&month=10', '?year=2026&month=0', '?year=2e3&month=10'])('keeps invalid %s visible with associated feedback and no reports', search => {
        setup(`/app/dashboard${search}#report-month`);
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByLabelText('Reporting month')).toHaveAttribute('aria-describedby', expect.stringContaining('report-period-error'));
        expect(getDashboard).not.toHaveBeenCalled(); expect(getCategoryBreakdown).not.toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent(`/app/dashboard${search}#report-month`);
    });
    it('pins an explicitly applied current month and leaves supplied leading zeros intact on load', async () => {
        setup('/app/dashboard?year=2026&month=01');
        await screen.findByRole('region', { name: 'Financial overview for January 2026' });
        expect(screen.getByTestId('location')).toHaveTextContent('month=01');
        expect(screen.getByLabelText('Reporting month')).toHaveValue('1');
        const calls = vi.mocked(getDashboard).mock.calls.length;
        act(() => window.dispatchEvent(new Event('focus')));
        expect(getDashboard).toHaveBeenCalledTimes(calls);
        fireEvent.click(screen.getByRole('button', { name: 'Apply period' }));
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/dashboard\?year=2026&month=1$/));
    });
    it('rolls default reports forward on focus without erasing dirty drafts or fetching unchanged months', async () => {
        vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59)); loginSession(makeToken());
        setup('/app/dashboard');
        await screen.findByRole('region', { name: 'Financial overview for December 2026' });
        fireEvent.change(screen.getByLabelText('Reporting year'), { target: { value: '2024' } });
        const oldSignal = vi.mocked(getDashboard).mock.calls.at(-1)![1]!;
        act(() => { vi.setSystemTime(new Date(2027, 0, 1)); window.dispatchEvent(new Event('focus')); });
        await screen.findByRole('region', { name: 'Financial overview for January 2027' });
        expect(oldSignal.aborted).toBe(true);
        expect(screen.getByLabelText('Reporting year')).toHaveValue(2024);
        expect(screen.getByLabelText('Reporting month')).toHaveValue('12');
        expect(screen.getByRole('status')).toHaveTextContent('Current reporting month has changed');
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/dashboard$/);
        const calls = vi.mocked(getDashboard).mock.calls.length;
        act(() => window.dispatchEvent(new Event('focus')));
        expect(getDashboard).toHaveBeenCalledTimes(calls);
        fireEvent.click(screen.getByRole('button', { name: 'Current month' }));
        expect(screen.getByLabelText('Reporting year')).toHaveValue(2027);
        expect(screen.getByLabelText('Reporting month')).toHaveValue('1');
        expect(screen.queryByRole('status')).toBeNull();
        expect(getDashboard).toHaveBeenCalledTimes(calls);
    });
    it('refresh rechecks the rolling calendar immediately and keeps unsaved edits', async () => {
        vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59)); loginSession(makeToken());
        setup('/app/dashboard'); await screen.findByRole('region', { name: 'Financial overview for December 2026' });
        fireEvent.change(screen.getByLabelText('Reporting year'), { target: { value: '2024' } });
        vi.setSystemTime(new Date(2027, 0, 1));
        fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
        await screen.findByRole('region', { name: 'Financial overview for January 2027' });
        expect(getDashboard).toHaveBeenCalledTimes(2);
        expect(getCategoryBreakdown).toHaveBeenCalledTimes(2);
        expect(screen.getByLabelText('Reporting year')).toHaveValue(2024);
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/dashboard$/);
    });
    it('updates pristine drafts on rollover but keeps explicit current-month reports pinned', async () => {
        vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59)); loginSession(makeToken());
        const view = setup('/app/dashboard'); await screen.findByRole('region', { name: 'Financial overview for December 2026' });
        act(() => { vi.setSystemTime(new Date(2027, 0, 1)); window.dispatchEvent(new Event('focus')); });
        await screen.findByRole('region', { name: 'Financial overview for January 2027' });
        expect(screen.getByLabelText('Reporting year')).toHaveValue(2027); expect(screen.getByLabelText('Reporting month')).toHaveValue('1');
        view.unmount(); setup('/app/dashboard?year=2027&month=1');
        await screen.findByRole('region', { name: 'Financial overview for January 2027' });
        const calls = vi.mocked(getDashboard).mock.calls.length;
        act(() => { vi.setSystemTime(new Date(2027, 0, 1, 0, 1)); window.dispatchEvent(new Event('focus')); });
        expect(getDashboard).toHaveBeenCalledTimes(calls);
        fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
        await waitFor(() => expect(getDashboard).toHaveBeenCalledTimes(calls + 1));
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/dashboard\?year=2027&month=1$/);
    });
    it('keeps the local default month on the bare Dashboard URL', async () => {
        setup('/app/dashboard');
        const now = new Date(); await waitFor(() => expect(getDashboard).toHaveBeenCalled());
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/dashboard$/);
        expect(getDashboard).toHaveBeenCalledWith({ year: String(now.getFullYear()), month: String(now.getMonth() + 1) }, expect.any(AbortSignal));
    });
    it('returns from a pinned report to a fresh default month without requesting the old local month', async () => {
        vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59)); loginSession(makeToken());
        setup('/app/dashboard?year=2026&month=11');
        await screen.findByRole('region', { name: 'Financial overview for November 2026' });
        vi.setSystemTime(new Date(2027, 0, 1));
        fireEvent.click(screen.getByRole('button', { name: 'Current month' }));
        await screen.findByRole('region', { name: 'Financial overview for January 2027' });
        expect(getDashboard).toHaveBeenCalledTimes(2);
        expect(getDashboard).toHaveBeenLastCalledWith({ year: '2027', month: '1' }, expect.any(AbortSignal));
        expect(getCategoryBreakdown).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/dashboard$/);
    });
    it('changes calendar bounds via Apply and restores period/form on browser Back', async () => {
        setup(); await loaded(); fireEvent.change(screen.getByLabelText('Reporting year'), { target: { value: '2024' } });
        await userEvent.selectOptions(screen.getByLabelText('Reporting month'), '2'); await userEvent.click(screen.getByRole('button', { name: 'Apply period' }));
        await waitFor(() => expect(getCategoryBreakdown).toHaveBeenLastCalledWith({ from: '2024-02-01', to: '2024-02-29' }, expect.any(AbortSignal)));
        expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard?year=2024&month=2');
        await userEvent.click(screen.getByRole('button', { name: 'Browser back' })); await loaded();
        expect(screen.getByLabelText('Reporting year')).toHaveValue(2026); expect(screen.getByLabelText('Reporting month')).toHaveValue('10');
    });
    it('rejects invalid URL and form input without requests or silently replacing the period', async () => {
        setup('/app/dashboard?year=10000&month=10'); expect(screen.getByRole('alert')).toHaveTextContent('Choose a valid reporting month');
        expect(getDashboard).not.toHaveBeenCalled(); expect(getCategoryBreakdown).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole('button', { name: 'Apply period' }));
        expect(screen.getByLabelText('Reporting year')).toHaveValue(10000); expect(screen.getByLabelText('Reporting year')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByTestId('location')).toHaveTextContent('year=10000');
        await userEvent.click(screen.getByRole('button', { name: 'Current month' }));
        await waitFor(() => expect(getDashboard).toHaveBeenCalled());
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
        setup(); const dashboardSignal = vi.mocked(getDashboard).mock.calls[0][1]!; const categorySignal = vi.mocked(getCategoryBreakdown).mock.calls[0][1]!;
        await userEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' })); await loaded();
        expect(dashboardSignal.aborted).toBe(true); expect(categorySignal.aborted).toBe(true);
        await act(async () => { finishDashboard({ ...dashboard, totalActiveAccountBalance: '123' }); finishCategories({ ...categories, items: [] }); });
        expect(screen.queryByText('₹123.00')).toBeNull(); expect(await screen.findByRole('list', { name: 'Expense categories for October 2026' })).toBeInTheDocument();
        vi.mocked(getDashboard).mockReturnValueOnce(new Promise(() => {})); vi.mocked(getCategoryBreakdown).mockReturnValueOnce(new Promise(() => {}));
        await userEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
        expect(screen.queryByRole('region', { name: /Financial overview/ })).toBeNull(); expect(screen.getByText('Loading dashboard…')).toBeInTheDocument();
    });
    it('discards out-of-order month responses and cancels both requests on unmount', async () => {
        let finish!: (data: DashboardResponse) => void;
        vi.mocked(getDashboard).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
        const view = setup(); const old = vi.mocked(getDashboard).mock.calls[0][1]!;
        await userEvent.selectOptions(screen.getByLabelText('Reporting month'), '11'); await userEvent.click(screen.getByRole('button', { name: 'Apply period' }));
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
