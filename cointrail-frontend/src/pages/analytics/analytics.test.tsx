import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { loginSession, logoutSession } from '../../api/session';
import { makeToken } from '../../test/session';
import { ApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { getAccountBreakdown, getAnalyticsComparison, getAnalyticsSummary, getAnalyticsTrends, getCategoryBreakdown } from '../../services/analyticsService';
import { accounts, categories, comparison, summary, trends } from './fixtures';
import type { SummaryResponse } from '../../types/analytics';

vi.mock('../../services/analyticsService', async importOriginal => ({ ...await importOriginal<typeof import('../../services/analyticsService')>(), getAccountBreakdown: vi.fn(), getAnalyticsComparison: vi.fn(), getAnalyticsSummary: vi.fn(), getAnalyticsTrends: vi.fn(), getCategoryBreakdown: vi.fn() }));
vi.mock('recharts', async importOriginal => ({ ...await importOriginal<typeof import('recharts')>(), ResponsiveContainer: () => <div aria-hidden="true" /> }));
function Location() { const location = useLocation(); const navigate = useNavigate(); return <><span data-testid="location">{location.pathname + location.search}</span><button onClick={() => navigate(-1)}>Browser back</button><button onClick={() => navigate(1)}>Browser forward</button></>; }
const url = '/app/analytics?from=2024-02-01&to=2024-02-29&grouping=WEEKLY';
function setup(path = url) { return render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /><Location /></AuthProvider></MemoryRouter>); }
const region = (name: string) => screen.getByRole('region', { name });
async function loaded() { await screen.findByRole('link', { name: 'Historical bank' }); await screen.findByRole('table'); await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh all reports' })).toBeEnabled()); }
beforeEach(() => {
    vi.resetAllMocks(); loginSession(makeToken());
    vi.mocked(getAnalyticsSummary).mockResolvedValue(summary); vi.mocked(getAnalyticsTrends).mockResolvedValue(trends);
    vi.mocked(getCategoryBreakdown).mockResolvedValue(categories); vi.mocked(getAccountBreakdown).mockResolvedValue(accounts); vi.mocked(getAnalyticsComparison).mockResolvedValue(comparison);
});
afterEach(() => { cleanup(); logoutSession(); vi.restoreAllMocks(); });

describe('Analytics reports and authoritative exact values', () => {
    it('renders one protected Clarity page with exact overview, inactive account metadata and all bucket values', async () => {
        setup(); await loaded(); const overview = region('Overview');
        expect(within(overview).getByText(formatMoney(summary.totals.income))).toBeInTheDocument();
        expect(within(overview).getByText(formatMoney(summary.totals.expense))).toBeInTheDocument();
        expect(within(overview).getByText(formatMoney(summary.totals.netCashFlow))).toBeInTheDocument();
        expect(within(overview).getByText('9007199254740993')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Historical bank' })).toHaveAttribute('href', '/app/transactions?from=2024-02-01&to=2024-02-29&accountId=9223372036854775807&page=0');
        expect(within(region('Account activity')).getByText(/BANK · Inactive/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View income transactions' })).toHaveAttribute('href', '/app/transactions?from=2024-02-01&to=2024-02-29&type=INCOME&page=0');
        expect(screen.getAllByRole('main')).toHaveLength(1); expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute('aria-current', 'page');
        expect(getAnalyticsComparison).not.toHaveBeenCalled(); expect(screen.queryByText('Total balance')).toBeNull();
        expect(getAnalyticsSummary).toHaveBeenCalledWith({ from: '2024-02-01', to: '2024-02-29' }, expect.any(AbortSignal));
    });
    it.each(['DAILY', 'WEEKLY', 'MONTHLY'] as const)('requests backend%s without rebucketing data', async grouping => {
        vi.mocked(getAnalyticsTrends).mockResolvedValue({ ...trends, grouping }); setup(url.replace('WEEKLY', grouping)); await loaded();
        expect(getAnalyticsTrends).toHaveBeenCalledWith({ from: '2024-02-01', to: '2024-02-29' }, grouping, expect.any(AbortSignal));
        expect(screen.getByRole('table', { name: `Exact ${grouping.toLowerCase()} bucket values` })).toBeInTheDocument();
    });
    it('shows empty groups and zero overview without fabricating trend data', async () => {
        const zero = { income: '0', expense: '0', netCashFlow: '0', transactionCount: '0' };
        vi.mocked(getAnalyticsSummary).mockResolvedValue({ ...summary, totals: zero }); vi.mocked(getAnalyticsTrends).mockResolvedValue({ ...trends, totals: zero, items: [trends.items[1]] });
        vi.mocked(getCategoryBreakdown).mockResolvedValue({ ...categories, items: [] }); vi.mocked(getAccountBreakdown).mockResolvedValue({ ...accounts, items: [] });
        setup(); expect(await screen.findByRole('heading', { name: 'No account activity' })).toBeInTheDocument(); expect(screen.getByRole('heading', { name: 'No expense category activity' })).toBeInTheDocument();
        expect(within(region('Overview')).getAllByText('₹0.00')).toHaveLength(3); expect(screen.getAllByRole('row')).toHaveLength(2);
    });
    it('changes category presentation only without refetching or filtering overview/trends', async () => {
        setup(); await loaded(); await userEvent.selectOptions(screen.getByLabelText('Category breakdown view'), 'INCOME');
        expect(screen.getByRole('link', { name: 'Salary' })).toBeInTheDocument(); expect(getCategoryBreakdown).toHaveBeenCalledOnce(); expect(getAnalyticsSummary).toHaveBeenCalledOnce(); expect(getAnalyticsTrends).toHaveBeenCalledOnce();
    });
});

describe('Analytics range, comparison and browser history', () => {
    it('defaults to an explicit current browser month and keeps invalid URLs request-free', async () => {
        const year = new Date().getFullYear(); const month = String(new Date().getMonth() + 1).padStart(2, '0');
        setup('/app/analytics'); await loaded(); expect(screen.getByTestId('location')).toHaveTextContent(`from=${year}-${month}-01`); expect(screen.getByTestId('location')).toHaveTextContent('grouping=DAILY');
    });
    it.each(['?from=2024-02-30&to=2024-03-01', '?from=2024-01-01', '?from=2024-01-01&to=2024-01-31&categoryId=1', '?from=2024-01-01&to=2024-01-31&grouping=YEARLY', '?from=2024-01-01&to=2025-01-01&grouping=DAILY', '?from=2024-01-01&to=2024-01-31&compareFrom=2023-01-01'])('rejects%s and does not fetch any report', search => {
        setup(`/app/analytics${search}`); expect(screen.getByRole('alert')).toBeInTheDocument();
        for (const service of [getAnalyticsSummary, getAnalyticsTrends, getAccountBreakdown, getCategoryBreakdown, getAnalyticsComparison]) expect(service).not.toHaveBeenCalled();
    });
    it('retains invalid form drafts, links field errors and focuses the invalid input', async () => {
        setup(); await loaded(); fireEvent.change(screen.getByLabelText('From'), { target: { value: '2025-01-01' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Check your reporting dates'); expect(screen.getByLabelText('From')).toHaveValue('2025-01-01');
        await waitFor(() => expect(screen.getByLabelText('To')).toHaveFocus()); expect(screen.getByLabelText('To')).toHaveAttribute('aria-invalid', 'true'); expect(getAnalyticsSummary).toHaveBeenCalledOnce();
    });
    it('preserves drafts through report refresh and applies only committed range changes', async () => {
        setup(); await loaded(); fireEvent.change(screen.getByLabelText('To'), { target: { value: '2024-02-28' } });
        fireEvent.click(screen.getByRole('button', { name: 'Refresh all reports' })); await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(2));
        expect(screen.getByLabelText('To')).toHaveValue('2024-02-28'); expect(vi.mocked(getAnalyticsSummary).mock.calls[1][0].to).toBe('2024-02-29');
        fireEvent.click(screen.getByRole('button', { name: 'Apply range' })); await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(3)); expect(screen.getByTestId('location')).toHaveTextContent('to=2024-02-28');
    });
    it('refetches only trends for grouping and restores applied URL state with Back/Forward', async () => {
        setup(); await loaded(); fireEvent.change(screen.getByLabelText('Trend grouping'), { target: { value: 'MONTHLY' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
        await waitFor(() => expect(getAnalyticsTrends).toHaveBeenCalledTimes(2)); expect(getAnalyticsSummary).toHaveBeenCalledOnce(); expect(getCategoryBreakdown).toHaveBeenCalledOnce(); expect(getAccountBreakdown).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByRole('button', { name: 'Browser back' })); await waitFor(() => expect(screen.getByLabelText('Trend grouping')).toHaveValue('WEEKLY'));
        fireEvent.click(screen.getByRole('button', { name: 'Browser forward' })); await waitFor(() => expect(screen.getByLabelText('Trend grouping')).toHaveValue('MONTHLY'));
    });
    it('reconciles native restored controls after popstate without financially refetching unchanged state', async () => {
        setup(); await loaded(); act(() => { window.dispatchEvent(new PopStateEvent('popstate')); fireEvent.change(screen.getByLabelText('Trend grouping'), { target: { value: 'DAILY' } }); });
        await waitFor(() => expect(screen.getByLabelText('Trend grouping')).toHaveValue('WEEKLY')); expect(getAnalyticsTrends).toHaveBeenCalledOnce();
    });
    it('adds explicit comparison only on Apply, displays signed authoritative deltas and removes it', async () => {
        setup(); await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Add comparison' })); expect(getAnalyticsComparison).not.toHaveBeenCalled();
        fireEvent.change(screen.getByLabelText('Comparison from'), { target: { value: '2024-02-01' } }); fireEvent.change(screen.getByLabelText('Comparison to'), { target: { value: '2024-02-01' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
        await screen.findByRole('heading', { name: 'Delta' }); expect(getAnalyticsSummary).toHaveBeenCalledOnce();
        expect(getAnalyticsComparison).toHaveBeenCalledWith({ from: '2024-02-01', to: '2024-02-29' }, { from: '2024-02-01', to: '2024-02-01' }, expect.any(AbortSignal));
        const delta = screen.getByRole('heading', { name: 'Delta' }).parentElement!;
        expect(within(delta).getByText(`+${formatMoney(comparison.delta.expense)}`)).toBeInTheDocument(); expect(within(delta).getByText(formatMoney(comparison.delta.netCashFlow))).toBeInTheDocument();
        expect(within(delta).getByText('+9007199254740993')).toBeInTheDocument(); expect(screen.getByText(/unequal durations/)).toBeInTheDocument(); expect(screen.getByText(/periods overlap/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Remove comparison' })); expect(screen.queryByRole('heading', { name: 'Delta' })).toBeNull(); expect(screen.getByTestId('location').textContent).not.toContain('compareFrom');
    });
    it('validates optional comparison dates without dispatch and preserves input', async () => {
        setup(); await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Add comparison' })); fireEvent.change(screen.getByLabelText('Comparison from'), { target: { value: '2024-02-01' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Check your comparison dates'); expect(screen.getByLabelText('Comparison from')).toHaveValue('2024-02-01'); expect(getAnalyticsComparison).not.toHaveBeenCalled();
    });
    it('refetches comparison alone when only baseline changes', async () => {
        setup(url + '&compareFrom=2024-02-01&compareTo=2024-02-01'); await loaded(); await screen.findByRole('heading', { name: 'Delta' });
        fireEvent.change(screen.getByLabelText('Comparison to'), { target: { value: '2024-02-02' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
        await waitFor(() => expect(getAnalyticsComparison).toHaveBeenCalledTimes(2)); expect(getAnalyticsSummary).toHaveBeenCalledOnce(); expect(getAnalyticsTrends).toHaveBeenCalledOnce();
    });
});

describe('Analytics independent errors, cancellation and sessions', () => {
    const services = [getAnalyticsSummary, getAnalyticsTrends, getCategoryBreakdown, getAccountBreakdown, getAnalyticsComparison];
    it.each(services.map((service, index) => ({ service, index })))('retries only failed report$index without hiding successful sections', async ({ service, index }) => {
        vi.mocked(service).mockRejectedValueOnce(new ApiError(`Report ${index} unavailable`, 'timeout'));
        setup(url + '&compareFrom=2024-02-01&compareTo=2024-02-01');
        expect(await screen.findByRole('alert')).toHaveTextContent(`Report ${index} unavailable`);
        fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await waitFor(() => expect(service).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
        for (const other of services.filter(item => item !== service)) expect(other).toHaveBeenCalledOnce();
    });
    it.each([400, 404, 500])('preserves drafts after server%s and requires explicit retry', async status => {
        vi.mocked(getAnalyticsSummary).mockRejectedValueOnce(new ApiError('Server declined this range', status === 400 ? 'validation' : status === 404 ? 'not-found' : 'server', status));
        setup(); expect(await screen.findByRole('alert')).toHaveTextContent('Server declined this range');
        fireEvent.change(screen.getByLabelText('From'), { target: { value: '2024-02-02' } }); expect(screen.getByLabelText('From')).toHaveValue('2024-02-02'); expect(getAnalyticsSummary).toHaveBeenCalledOnce();
    });
    it('aborts a prior period and ignores its late success even when the mock ignores AbortSignal', async () => {
        let finish!: (report: SummaryResponse) => void;
        vi.mocked(getAnalyticsSummary).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        setup(); await screen.findByRole('link', { name: 'Historical bank' }); const signal = vi.mocked(getAnalyticsSummary).mock.calls[0][1]!;
        expect(screen.getByRole('button', { name: 'Refresh overview' })).toBeDisabled();
        fireEvent.change(screen.getByLabelText('From'), { target: { value: '2024-02-02' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
        await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(2)); expect(signal.aborted).toBe(true);
        await act(async () => finish({ ...summary, totals: { ...summary.totals, income: '777' } }));
        expect(screen.queryByText('₹777.00')).toBeNull();
    });
    it('does not show previous money as current during refresh and blocks duplicate pending refresh', async () => {
        setup(); await loaded(); let finish!: (value: SummaryResponse) => void;
        vi.mocked(getAnalyticsSummary).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        fireEvent.click(screen.getByRole('button', { name: 'Refresh overview' })); expect(within(region('Overview')).queryByText(formatMoney(summary.totals.income))).toBeNull();
        expect(screen.getByRole('button', { name: 'Refresh overview' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Refresh all reports' })).toBeDisabled();
        await act(async () => finish(summary)); expect(within(region('Overview')).getByText(formatMoney(summary.totals.income))).toBeInTheDocument();
    });
    it('aborts all report reads on unmount', async () => {
        for (const service of services.slice(0, 4)) vi.mocked(service).mockImplementation(() => new Promise<never>(() => {}));
        const view = setup(); await waitFor(() => expect(getAccountBreakdown).toHaveBeenCalledOnce()); view.unmount();
        for (const service of services.slice(0, 4)) {
            const calls = vi.mocked(service).mock.calls; const last = calls[0][calls[0].length - 1] as AbortSignal; expect(last.aborted).toBe(true);
        }
    });
    it('ignores a stale failed request after a newer reporting range succeeds', async () => {
        let fail!: (error: Error) => void;
        vi.mocked(getAnalyticsSummary).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
        setup(); await screen.findByRole('link', { name: 'Historical bank' });
        fireEvent.change(screen.getByLabelText('To'), { target: { value: '2024-02-28' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
        await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(2));
        await act(async () => fail(new ApiError('Obsolete network failure', 'network'))); expect(screen.queryByText('Obsolete network failure')).toBeNull();
        expect(within(region('Overview')).getByText(formatMoney(summary.totals.income))).toBeInTheDocument();
    });
    it('keeps a network error independent and does not automatically retry it', async () => {
        vi.mocked(getCategoryBreakdown).mockRejectedValueOnce(new ApiError('Unable to reach categories', 'network'));
        setup(); expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach categories');
        expect(await screen.findByRole('link', { name: 'Historical bank' })).toBeInTheDocument(); expect(getCategoryBreakdown).toHaveBeenCalledOnce();
    });
    it('accepts an empty comparison baseline and renders zero and negative signed deltas exactly', async () => {
        vi.mocked(getAnalyticsComparison).mockResolvedValue({ ...comparison, delta: { income: '0', expense: '-0.01', netCashFlow: '0.01', transactionCount: '-9007199254740993' } });
        setup(url + '&compareFrom=2024-02-01&compareTo=2024-02-01'); const heading = await screen.findByRole('heading', { name: 'Delta' });
        const delta = heading.parentElement!; expect(within(delta).getByText('₹0.00')).toBeInTheDocument(); expect(within(delta).getByText('-₹0.01')).toBeInTheDocument();
        expect(within(delta).getByText('+₹0.01')).toBeInTheDocument(); expect(within(delta).getByText('-9007199254740993')).toBeInTheDocument();
    });
    it('clears old owner data and ignores late responses after session replacement', async () => {
        let finish!: (value: SummaryResponse) => void; vi.mocked(getAnalyticsSummary).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        setup(); await screen.findByRole('link', { name: 'Historical bank' }); const oldSignal = vi.mocked(getAnalyticsSummary).mock.calls[0][1]!;
        vi.mocked(getAccountBreakdown).mockResolvedValue({ ...accounts, items: [] });
        act(() => loginSession(makeToken(undefined, 'other@example.com')));
        await screen.findByRole('heading', { name: 'No account activity' }); expect(oldSignal.aborted).toBe(true); expect(screen.queryByRole('link', { name: 'Historical bank' })).toBeNull();
        await act(async () => finish({ ...summary, totals: { ...summary.totals, income: '777' } })); expect(screen.queryByText('₹777.00')).toBeNull();
    });
    it('returns to login when logging out, with no protected report data', async () => {
        setup(); await loaded(); await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
        expect(await screen.findByRole('link', { name: 'Get Started' })).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'Analytics' })).toBeNull();
    });
});
