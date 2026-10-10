import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { loginSession, logoutSession } from '../../api/session';
import { makeToken } from '../../test/session';
import { ApiError } from '../../api/errors';
import { getRecurringTransactions, getRecurringTransaction, createRecurringTransaction, updateRecurringTransaction, pauseRecurringTransaction, resumeRecurringTransaction, cancelRecurringTransaction } from '../../services/recurringTransactionService';
import { getAccounts } from '../../services/accountService';
import { getCategories } from '../../services/categoryService';
import { getDashboard } from '../../services/dashboardService';
import { recurringStatuses, recurrenceFrequencies, type RecurringTransactionResponse, type RecurringPage } from '../../types/recurringTransaction';
import { dashboard } from '../dashboard/fixtures';

// Keep actual input/date/amount validation; mock only network operations.
vi.mock('../../services/recurringTransactionService', async importOriginal => ({ ...await importOriginal<typeof import('../../services/recurringTransactionService')>(),
    getRecurringTransactions: vi.fn(), getRecurringTransaction: vi.fn(), createRecurringTransaction: vi.fn(), updateRecurringTransaction: vi.fn(), pauseRecurringTransaction: vi.fn(), resumeRecurringTransaction: vi.fn(), cancelRecurringTransaction: vi.fn() }));
vi.mock('../../services/accountService'); vi.mock('../../services/categoryService'); vi.mock('../../services/dashboardService');
const id = '9223372036854775807'; const accountId = '9007199254740993'; const categoryId = '9007199254740995';
const rule: RecurringTransactionResponse = { id, accountId, accountName: 'Historical account', categoryId, categoryName: 'Historical expense', type: 'EXPENSE', amount: '99999999999999999.99', description: 'Scheduled rent', frequency: 'MONTHLY', startDate: '2099-01-31', endDate: null, nextDueDate: '2099-01-31', status: 'ACTIVE', blockedReason: null, createdAt: '2026-10-09T00:00:00', updatedAt: '2026-10-09T00:00:00' };
const page: RecurringPage = { content: [rule], number: '0', size: '20', totalElements: '1', totalPages: '1' };
const account = { id: accountId, name: 'Bank', type: 'BANK' as const, active: true, openingBalance: '0', createdAt: '', updatedAt: '' };
const category = { id: categoryId, name: 'Rent', type: 'EXPENSE' as const, active: true, system: true, createdAt: '', updatedAt: '' };
function Location() { const location = useLocation(); const navigate = useNavigate(); return <><span data-testid="location">{location.pathname + location.search}</span><button onClick={() => navigate(-1)}>Browser back</button><button onClick={() => navigate(1)}>Browser forward</button></>; }
function setup(path = '/app/recurring') { return render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /><Location /></AuthProvider></MemoryRouter>); }
beforeEach(() => {
    vi.resetAllMocks(); loginSession(makeToken()); vi.mocked(getRecurringTransactions).mockResolvedValue(page); vi.mocked(getRecurringTransaction).mockResolvedValue(rule);
    vi.mocked(createRecurringTransaction).mockResolvedValue(rule); vi.mocked(updateRecurringTransaction).mockResolvedValue(rule); vi.mocked(pauseRecurringTransaction).mockResolvedValue({ ...rule, status: 'PAUSED' }); vi.mocked(resumeRecurringTransaction).mockResolvedValue(rule); vi.mocked(cancelRecurringTransaction).mockResolvedValue();
    vi.mocked(getAccounts).mockResolvedValue([account, { ...account, id: '2', name: 'Inactive account', active: false }]);
    vi.mocked(getCategories).mockResolvedValue([category, { ...category, id: '3', name: 'Salary', type: 'INCOME', system: false }, { ...category, id: '4', name: 'Inactive category', active: false }]); vi.mocked(getDashboard).mockResolvedValue(dashboard);
});
afterEach(() => { cleanup(); logoutSession(); });
async function fillCreate(amount = rule.amount) {
    await screen.findByRole('option', { name: 'Rent (System)' }); fireEvent.change(screen.getByLabelText('Account'), { target: { value: accountId } }); fireEvent.change(screen.getByLabelText('Category'), { target: { value: categoryId } }); fireEvent.change(screen.getByLabelText('Amount (INR)'), { target: { value: amount } }); fireEvent.change(screen.getByLabelText('Start date'), { target: { value: rule.startDate } });
}

describe('Recurring list and URL navigation', () => {
    it('renders exact money and backend metadata with contextual Long links and neutral icons', async () => {
        setup(); const link = await screen.findByRole('link', { name: 'Scheduled rent' }); expect(link).toHaveAttribute('href', `/app/recurring/${id}?page=0&size=20&sort=createdAt%2Cdesc`);
        expect(screen.getByText('₹99,99,99,99,99,99,99,999.99')).toBeInTheDocument(); expect(screen.getByText('MONTHLY · ACTIVE')).toBeInTheDocument(); expect(screen.getByText('1 rules · Page 1 of 1')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled(); expect(document.querySelector('.ct-category-icon')).toBeInTheDocument();
    });
    it('uses filters, sorts and pagination without losing historical IDs', async () => {
        vi.mocked(getRecurringTransactions).mockImplementation(async query => ({ ...page, number: query.page ?? '0', totalElements: '50', totalPages: '10' }));
        setup(`/app/recurring?status=BLOCKED&type=EXPENSE&accountId=9223372036854775806&categoryId=9223372036854775805&size=5&sort=nextDueDate,asc`);
        const link = await screen.findByRole('link', { name: 'Scheduled rent' }); expect(link).toHaveAttribute('href', `/app/recurring/${id}?status=BLOCKED&type=EXPENSE&accountId=9223372036854775806&categoryId=9223372036854775805&page=0&size=5&sort=nextDueDate%2Casc`);
        expect(screen.getByLabelText('Account')).toHaveValue('9223372036854775806'); expect(screen.getByLabelText('Category')).toHaveValue('9223372036854775805');
        expect(screen.getByText('₹99,99,99,99,99,99,99,999.99')).toBeInTheDocument(); expect(document.querySelector('.ct-category-icon')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Recurring transactions' })).toHaveAttribute('aria-current', 'page');
        fireEvent.click(screen.getByRole('button', { name: 'Next page' })); await waitFor(() => expect(getRecurringTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ page: '1', accountId: '9223372036854775806', sort: 'nextDueDate,asc' }), expect.any(AbortSignal)));
        expect(await screen.findByRole('link', { name: 'Scheduled rent' })).toHaveAttribute('href', `/app/recurring/${id}?status=BLOCKED&type=EXPENSE&accountId=9223372036854775806&categoryId=9223372036854775805&page=1&size=5&sort=nextDueDate%2Casc`);
        fireEvent.click(screen.getByRole('link', { name: 'Scheduled rent' })); await screen.findByRole('button', { name: 'Pause rule' }); expect(screen.getByTestId('location')).toHaveTextContent(`/app/recurring/${id}?status=BLOCKED`);
    });
    it('preserves filters through detail/edit/browser-back/list navigation', async () => {
        const context = '?status=ACTIVE&type=EXPENSE&accountId=9223372036854775806&categoryId=9223372036854775805&page=1&size=5&sort=nextDueDate%2Casc';
        setup(`/app/recurring/${id}${context}`); await screen.findByRole('button', { name: 'Pause rule' });
        fireEvent.click(screen.getByRole('link', { name: 'Edit rule' })); await screen.findByLabelText('Amount (INR)'); expect(screen.getByRole('link', { name: 'Back to rule' })).toHaveAttribute('href', `/app/recurring/${id}${context}`);
        fireEvent.click(screen.getByRole('button', { name: 'Browser back' })); await screen.findByRole('button', { name: 'Pause rule' }); expect(screen.getByRole('link', { name: 'Back to recurring rules' })).toHaveAttribute('href', `/app/recurring${context}`);
        fireEvent.click(screen.getByRole('link', { name: 'Back to recurring rules' })); await screen.findByRole('link', { name: 'Scheduled rent' }); expect(screen.getByTestId('location')).toHaveTextContent(`/app/recurring${context}`);
    });
    it('restores pagination with browser back and forward', async () => {
        vi.mocked(getRecurringTransactions).mockImplementation(async query => ({ ...page, number: query.page ?? '0', totalElements: '50', totalPages: '10' })); setup('/app/recurring?status=BLOCKED&page=1'); await screen.findByRole('link', { name: 'Scheduled rent' });
        fireEvent.click(screen.getByRole('button', { name: 'Previous page' })); await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('page=0'));
        fireEvent.click(screen.getByRole('button', { name: 'Browser back' })); await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('page=1'));
        fireEvent.click(screen.getByRole('button', { name: 'Browser forward' })); await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('page=0')); expect(screen.getByLabelText('Status')).toHaveValue('BLOCKED');
    });
    it('applies status/type/reference/sort filters and resets page; history restores controls', async () => {
        setup('/app/recurring?page=2'); await screen.findByRole('link', { name: 'Scheduled rent' }); await screen.findByRole('option', { name: 'Bank' });
        for (const [label, value] of [['Status', 'PAUSED'], ['Type', 'INCOME'], ['Account', accountId], ['Category', '3'], ['Page size', '5'], ['Sort', 'updatedAt,asc']]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply filters' })); await waitFor(() => expect(getRecurringTransactions).toHaveBeenLastCalledWith({ status: 'PAUSED', type: 'INCOME', accountId, categoryId: '3', page: '0', size: '5', sort: 'updatedAt,asc' }, expect.any(AbortSignal)));
        fireEvent.click(screen.getByRole('button', { name: 'Clear filters' })); await waitFor(() => expect(screen.getByLabelText('Status')).toHaveValue(''));
        fireEvent.click(screen.getByRole('button', { name: 'Browser back' })); await waitFor(() => expect(screen.getByLabelText('Status')).toHaveValue('PAUSED')); fireEvent.click(screen.getByRole('button', { name: 'Browser forward' })); await waitFor(() => expect(screen.getByLabelText('Status')).toHaveValue(''));
    });
    it('keeps active selected IDs when asynchronous choices replace historical fallback options', async () => {
        let accounts!: (data: typeof account[]) => void; let categories!: (data: typeof category[]) => void;
        vi.mocked(getAccounts).mockReturnValueOnce(new Promise(resolve => { accounts = resolve; })); vi.mocked(getCategories).mockReturnValueOnce(new Promise(resolve => { categories = resolve; })); setup(`/app/recurring?accountId=${accountId}&categoryId=${categoryId}`);
        expect(screen.getByLabelText('Account')).toHaveValue(accountId); expect(screen.getByLabelText('Category')).toHaveValue(categoryId);
        await act(async () => { accounts([account]); categories([category]); }); expect(screen.getByLabelText('Account')).toHaveValue(accountId); expect(screen.getByLabelText('Category')).toHaveValue(categoryId);
        fireEvent.click(screen.getByRole('button', { name: 'Apply filters' })); await waitFor(() => expect(getRecurringTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ accountId, categoryId }), expect.any(AbortSignal)));
    });
    it('reconciles native history restoration with URL values after browser restoration', async () => {
        setup('/app/recurring?size=20&sort=createdAt,desc'); await screen.findByRole('link', { name: 'Scheduled rent' });
        // Native persisted-control restoration may also dispatch change events.
        fireEvent(window, new PopStateEvent('popstate')); fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'updatedAt,asc' } }); fireEvent.change(screen.getByLabelText('Page size'), { target: { value: '5' } });
        await waitFor(() => expect(screen.getByLabelText('Sort')).toHaveValue('createdAt,desc')); expect(screen.getByLabelText('Page size')).toHaveValue('20');
    });
    it.each(['status=INVALID', 'page=-1', 'size=101', 'sort=amount,desc', 'accountId=0', 'page=0&page=1', 'from=2026-01-01'])('does not read rules for malformed query %s', async search => {
        setup(`/app/recurring?${search}`); expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(getRecurringTransactions).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Clear filters' })); await screen.findByRole('link', { name: 'Scheduled rent' });
    });
    it('handles loading, failure, retry, empty filtering and out-of-range pages separately', async () => {
        vi.mocked(getRecurringTransactions).mockRejectedValueOnce(new ApiError('Offline rules', 'network')).mockResolvedValueOnce({ ...page, content: [], totalElements: '0', totalPages: '0' }); setup('/app/recurring?status=PAUSED');
        expect(screen.getByText('Loading recurring rules…')).toBeInTheDocument(); await screen.findByText('Offline rules'); fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await screen.findByText('No matching recurring rules');
        vi.mocked(getRecurringTransactions).mockResolvedValue({ ...page, content: [], number: '3', totalPages: '1' }); fireEvent.click(screen.getByRole('button', { name: 'Refresh rules' })); await screen.findByText('No rules on this page'); fireEvent.click(screen.getByRole('button', { name: 'First page' })); await waitFor(() => expect(getRecurringTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ page: '0' }), expect.any(AbortSignal)));
    });
    it('filter-choice errors do not prevent historical rule reads; choices can be retried', async () => {
        vi.mocked(getAccounts).mockRejectedValueOnce(new ApiError('Choice offline', 'network')); setup(`/app/recurring?accountId=${id}`);
        await screen.findByRole('link', { name: 'Scheduled rent' }); await screen.findByText(/Filter choices unavailable/); expect(screen.getByLabelText('Account')).toHaveValue(id); fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await screen.findByRole('option', { name: 'Bank' });
    });
    it('aborts replaced reads and prevents stale owner/list responses', async () => {
        let finish!: (data: RecurringPage) => void; vi.mocked(getRecurringTransactions).mockReturnValueOnce(new Promise(resolve => { finish = resolve; })); setup(); const signal = vi.mocked(getRecurringTransactions).mock.calls[0][1]!;
        fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'BLOCKED' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply filters' })); await screen.findByRole('link', { name: 'Scheduled rent' }); expect(signal.aborted).toBe(true);
        await act(async () => finish({ ...page, content: [{ ...rule, description: 'Stale owner' }] })); expect(screen.queryByText('Stale owner')).toBeNull();
        vi.mocked(getRecurringTransactions).mockResolvedValue({ ...page, content: [{ ...rule, description: 'New owner' }] }); act(() => loginSession(makeToken(undefined, 'replacement@example.com'))); expect(screen.queryByText('Scheduled rent')).toBeNull(); await screen.findByRole('link', { name: 'New owner' });
    });
});

describe('Recurring forms and immutable schedules', () => {
    it.each(recurrenceFrequencies)('creates an expense with exact amount/IDs and frequency %s', async frequency => {
        setup('/app/recurring/create?status=ACTIVE'); await fillCreate(); fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: frequency } }); fireEvent.change(screen.getByLabelText('End date (optional, inclusive)'), { target: { value: '2099-12-31' } });
        expect(screen.queryByRole('option', { name: /Inactive account|Inactive category|Salary/ })).toBeNull(); expect(screen.getByText(/January 31/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' })); await screen.findByRole('heading', { name: 'Recurring rule details' });
        expect(createRecurringTransaction).toHaveBeenCalledExactlyOnceWith({ accountId, categoryId, type: 'EXPENSE', amount: rule.amount, description: null, frequency, startDate: rule.startDate, endDate: '2099-12-31' }); expect(screen.getByTestId('location')).toHaveTextContent(`/${id}?status=ACTIVE`);
    });
    it('switches matching categories for income, preserves exact decimal and optional description', async () => {
        setup('/app/recurring/create'); await fillCreate('0.01'); fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'INCOME' } }); expect(screen.getByLabelText('Category')).toHaveValue(''); expect(screen.queryByRole('option', { name: 'Rent (System)' })).toBeNull();
        fireEvent.change(screen.getByLabelText('Category'), { target: { value: '3' } }); fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'Salary plan' } }); fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' }));
        await waitFor(() => expect(createRecurringTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: 'INCOME', categoryId: '3', amount: '0.01', description: 'Salary plan' })));
    });
    it.each(['0', '-1', '1.001', '100000000000000000'])('preserves invalid amount %s', async amount => {
        setup('/app/recurring/create'); await fillCreate(amount); fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' })); expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(screen.getByLabelText('Amount (INR)')).toHaveValue(amount); expect(createRecurringTransaction).not.toHaveBeenCalled();
    });
    it('validates calendar/end/description while backend today validation stays authoritative', async () => {
        setup('/app/recurring/create'); await fillCreate('10.00'); fireEvent.change(screen.getByLabelText('End date (optional, inclusive)'), { target: { value: '2099-01-30' } }); fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' }));
        expect(await screen.findByText('Use a valid end date on or after the start date.')).toBeInTheDocument(); expect(createRecurringTransaction).not.toHaveBeenCalled();
        fireEvent.change(screen.getByLabelText('End date (optional, inclusive)'), { target: { value: '' } }); fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'x'.repeat(501) } }); fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' })); expect(await screen.findByText('Use at most 500 characters.')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: '' } }); fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '0001-01-01' } }); expect(screen.getByLabelText('Start date')).not.toHaveAttribute('min');
        vi.mocked(createRecurringTransaction).mockRejectedValue(new ApiError('Invalid start', 'validation', 400, { startDate: 'Before backend today' })); fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' }));
        await screen.findByText('Before backend today'); expect(createRecurringTransaction).toHaveBeenCalledWith(expect.objectContaining({ startDate: '0001-01-01', description: '' })); expect(screen.getByLabelText('Start date')).toHaveAttribute('aria-invalid', 'true');
    });
    it.each([new ApiError('Invalid references', 'validation', 400, { categoryId: 'Mismatch', unexpected: 'Additional validation' }), new ApiError('Rule unavailable', 'not-found', 404), new ApiError('Due backlog conflict', 'conflict', 409), new ApiError('Request timed out', 'timeout')])('keeps failed create inputs and does not retry', async error => {
        vi.mocked(createRecurringTransaction).mockRejectedValue(error); setup('/app/recurring/create'); await fillCreate('10.00'); fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' })); await screen.findByText(error.message);
        expect(screen.getByLabelText('Amount (INR)')).toHaveValue('10.00'); expect(screen.getByLabelText('Account')).toHaveValue(accountId); expect(screen.getByLabelText('Category')).toHaveValue(categoryId); expect(createRecurringTransaction).toHaveBeenCalledOnce(); if (error.fieldErrors.unexpected) expect(screen.getByText('Additional validation')).toBeInTheDocument();
    });
    it('optional clock context can fail/retry without blocking creation', async () => {
        vi.mocked(getDashboard).mockRejectedValueOnce(new ApiError('Clock offline', 'network')); setup('/app/recurring/create'); await fillCreate(); await screen.findByText(/Server date context is unavailable/);
        expect(screen.getByRole('button', { name: 'Save recurring rule' })).toBeEnabled(); fireEvent.click(screen.getByRole('button', { name: 'Refresh date context' })); await screen.findByText(/Server date when retrieved: 2026-10-10 \(Pacific\/Kiritimati\)/);
    });
    it('handles resource errors/empty and deactivation without losing financial inputs', async () => {
        vi.mocked(getAccounts).mockRejectedValueOnce(new ApiError('Account offline', 'network')).mockResolvedValueOnce([]); setup('/app/recurring/create'); await screen.findByText('Account offline'); fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await screen.findByText('Eligible resources required');
        vi.mocked(getAccounts).mockResolvedValue([account]); fireEvent.click(screen.getByRole('button', { name: 'Refresh eligible resources' })); await fillCreate('10.00');
        vi.mocked(getAccounts).mockResolvedValue([{ ...account, active: false }]); fireEvent.click(screen.getByRole('button', { name: 'Refresh eligible resources' })); await screen.findByText('Eligible resources required'); expect(screen.getByLabelText('Amount (INR)')).toHaveValue('10.00'); expect(screen.getByLabelText('Account')).toHaveValue('');
        fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' })); await screen.findByText('Choose an active account.'); expect(createRecurringTransaction).not.toHaveBeenCalled();
    });
    it('edits only financial replacement fields while schedule/type remain read-only', async () => {
        vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, description: null, status: 'PAUSED', endDate: '2099-12-31' }); setup(`/app/recurring/${id}/edit`); const input = await screen.findByLabelText('Amount (INR)'); await screen.findByRole('option', { name: 'Bank' });
        expect(screen.queryByLabelText('Type')).toBeNull(); expect(screen.queryByLabelText('Frequency')).toBeNull(); expect(screen.queryByLabelText('Start date')).toBeNull(); expect(screen.getByText(/End: 2099-12-31/)).toBeInTheDocument();
        fireEvent.change(input, { target: { value: '0.01' } }); fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' })); await screen.findByRole('heading', { name: 'Recurring rule details' }); expect(updateRecurringTransaction).toHaveBeenCalledExactlyOnceWith(id, { accountId, categoryId, amount: '0.01', description: null });
    });
    it('requires eligible replacements for inactive historical references and preserves conflict edits on refresh', async () => {
        vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, accountId: '9', categoryId: '10' }); vi.mocked(updateRecurringTransaction).mockRejectedValue(new ApiError('Due occurrence conflict', 'conflict', 409)); setup(`/app/recurring/${id}/edit`);
        await screen.findByRole('option', { name: 'Bank' }); expect(screen.getByLabelText('Account')).toHaveValue(''); expect(screen.getByLabelText('Category')).toHaveValue(''); expect(screen.getByText('Current account: Historical account (ID 9)')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Account'), { target: { value: accountId } }); fireEvent.change(screen.getByLabelText('Category'), { target: { value: categoryId } }); fireEvent.change(screen.getByLabelText('Amount (INR)'), { target: { value: '10.00' } }); fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' })); await screen.findByText('Due occurrence conflict');
        fireEvent.click(screen.getByRole('button', { name: 'Refresh current rule' })); await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh current rule' })).toBeEnabled()); expect(screen.getByLabelText('Amount (INR)')).toHaveValue('10.00'); expect(updateRecurringTransaction).toHaveBeenCalledOnce();
    });
    it.each([null, '', '  Exact description\nretained  '])('dedicated blocked repair preserves original description %j and maximum amount', async description => {
        vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, accountId: '9', categoryId: '10', status: 'BLOCKED', blockedReason: 'ACCOUNT_INACTIVE', description }); vi.mocked(updateRecurringTransaction).mockResolvedValue({ ...rule, status: 'BLOCKED', description }); setup(`/app/recurring/${id}/edit?status=BLOCKED`);
        await screen.findByRole('heading', { name: 'Repair recurring rule' }); await screen.findByRole('option', { name: 'Bank' }); expect(screen.queryByLabelText('Amount (INR)')).toBeNull(); expect(screen.queryByLabelText('Description (optional)')).toBeNull();
        fireEvent.change(screen.getByLabelText('Account'), { target: { value: accountId } }); fireEvent.change(screen.getByLabelText('Category'), { target: { value: categoryId } }); fireEvent.click(screen.getByRole('button', { name: 'Save association repair' }));
        await screen.findByText(/Repair saved. Server returned BLOCKED/); expect(updateRecurringTransaction).toHaveBeenCalledExactlyOnceWith(id, { accountId, categoryId, amount: rule.amount, description });
    });
    it('acknowledges worker changes before repair and never overwrites server financial values with dirty inputs', async () => {
        setup(`/app/recurring/${id}/edit`); const input = await screen.findByLabelText('Amount (INR)'); fireEvent.change(input, { target: { value: '10.00' } });
        const blocked = { ...rule, amount: '11.00', description: 'Server description', status: 'BLOCKED' as const, blockedReason: 'CATEGORY_INACTIVE', updatedAt: '2026-10-09T00:01:00' }; vi.mocked(getRecurringTransaction).mockResolvedValue(blocked);
        fireEvent.click(screen.getByRole('button', { name: 'Refresh current rule' })); await screen.findByRole('heading', { name: 'Repair recurring rule' }); expect(screen.getByRole('button', { name: 'Save association repair' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Use current version for repair' })); await screen.findByRole('option', { name: 'Bank' }); fireEvent.click(screen.getByRole('button', { name: 'Save association repair' })); await waitFor(() => expect(updateRecurringTransaction).toHaveBeenCalledExactlyOnceWith(id, { accountId, categoryId, amount: '11.00', description: 'Server description' }));
    });
    it('failed blocked repair keeps references and uneditable financial fields exactly', async () => {
        vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, status: 'BLOCKED', blockedReason: 'ACCOUNT_INACTIVE', description: '' }); vi.mocked(updateRecurringTransaction).mockRejectedValue(new ApiError('Repair conflict', 'conflict', 409)); setup(`/app/recurring/${id}/edit`);
        await screen.findByRole('option', { name: 'Bank' }); fireEvent.click(screen.getByRole('button', { name: 'Save association repair' })); await screen.findByText('Repair conflict');
        expect(screen.getByLabelText('Account')).toHaveValue(accountId); expect(screen.getByLabelText('Category')).toHaveValue(categoryId); expect(screen.queryByLabelText('Amount (INR)')).toBeNull(); expect(updateRecurringTransaction).toHaveBeenCalledExactlyOnceWith(id, { accountId, categoryId, amount: rule.amount, description: '' });
    });
    it('ignores stale optional clock refreshes and aborts edit refresh on unmount', async () => {
        let oldClock!: (data: typeof dashboard) => void; vi.mocked(getDashboard).mockReturnValueOnce(new Promise(resolve => { oldClock = resolve; })); const create = setup('/app/recurring/create'); const clockSignal = vi.mocked(getDashboard).mock.calls[0][1]!;
        fireEvent.click(screen.getByRole('button', { name: 'Refresh date context' })); await screen.findByText(/Server date when retrieved: 2026-10-10/); expect(clockSignal.aborted).toBe(true); await act(async () => oldClock({ ...dashboard, pendingRecurringTransactions: { ...dashboard.pendingRecurringTransactions, timezone: 'Stale zone' } })); expect(screen.queryByText(/Stale zone/)).toBeNull(); create.unmount();
        const edit = setup(`/app/recurring/${id}/edit`); await screen.findByLabelText('Amount (INR)'); let finish!: (data: RecurringTransactionResponse) => void; vi.mocked(getRecurringTransaction).mockReturnValueOnce(new Promise(resolve => { finish = resolve; })); fireEvent.click(screen.getByRole('button', { name: 'Refresh current rule' })); const signal = vi.mocked(getRecurringTransaction).mock.calls.at(-1)![1]!; edit.unmount(); expect(signal.aborted).toBe(true); await act(async () => finish({ ...rule, description: 'Stale edit' })); expect(screen.queryByText('Stale edit')).toBeNull();
    });
    it.each(['CANCELLED', 'COMPLETED'] as const)('direct edit of %s remains read-only with null cursor and no resources', async status => {
        vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, status, nextDueDate: null }); setup(`/app/recurring/${id}/edit`); await screen.findByRole('heading', { name: 'Recurring rule is read-only' }); expect(screen.getByText('Next due: No next due date')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /Save/ })).toBeNull(); expect(getAccounts).not.toHaveBeenCalled(); expect(getCategories).not.toHaveBeenCalled();
    });
    it('keeps dirty input visible if a refresh finds a terminal rule', async () => {
        setup(`/app/recurring/${id}/edit`); fireEvent.change(await screen.findByLabelText('Amount (INR)'), { target: { value: '10.00' } }); vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, status: 'CANCELLED', nextDueDate: null }); fireEvent.click(screen.getByRole('button', { name: 'Refresh current rule' }));
        await screen.findByRole('heading', { name: 'Recurring rule is read-only' }); expect(screen.getByText(/Unsaved amount: 10.00/)).toBeInTheDocument(); expect(updateRecurringTransaction).not.toHaveBeenCalled();
    });
    it('guards duplicate submissions and ignores save completion after session changes', async () => {
        let finish!: (data: RecurringTransactionResponse) => void; vi.mocked(createRecurringTransaction).mockReturnValue(new Promise(resolve => { finish = resolve; })); setup('/app/recurring/create'); await fillCreate(); fireEvent.click(screen.getByRole('button', { name: 'Save recurring rule' }));
        expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled(); fireEvent.submit(screen.getByLabelText('Amount (INR)').closest('form')!); expect(createRecurringTransaction).toHaveBeenCalledOnce();
        act(() => loginSession(makeToken(undefined, 'new-owner@example.com'))); await screen.findByRole('button', { name: 'Save recurring rule' }); expect(screen.getByLabelText('Amount (INR)')).toHaveValue(''); await act(async () => finish(rule)); expect(screen.getByTestId('location')).toHaveTextContent('/app/recurring/create'); expect(getRecurringTransaction).not.toHaveBeenCalled();
    });
    it('shows and retries inaccessible edit reads; invalid context has one heading and no detail request', async () => {
        vi.mocked(getRecurringTransaction).mockRejectedValueOnce(new ApiError('Missing rule', 'not-found', 404)); const view = setup(`/app/recurring/${id}/edit`); await screen.findByText('Missing rule'); fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await screen.findByLabelText('Amount (INR)'); view.unmount(); vi.mocked(getRecurringTransaction).mockClear();
        setup(`/app/recurring/${id}/edit?sort=amount,desc`); expect(screen.getAllByRole('main')).toHaveLength(1); expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1); expect(getRecurringTransaction).not.toHaveBeenCalled(); expect(screen.getByRole('link', { name: 'Clear invalid filters' })).toHaveAttribute('href', `/app/recurring/${id}/edit`);
    });
});

describe('Recurring lifecycle confirmations and server-returned state', () => {
    it.each(recurringStatuses)('offers only supported actions for %s and historical detail remains readable', async status => {
        vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, status, nextDueDate: ['CANCELLED', 'COMPLETED'].includes(status) ? null : rule.nextDueDate, blockedReason: status === 'BLOCKED' ? 'ACCOUNT_INACTIVE' : null }); setup(`/app/recurring/${id}`); await screen.findByText(`Status: ${status}`);
        expect(screen.getByText('Account: Historical account')).toBeInTheDocument(); expect(screen.getByText('Category: Historical expense')).toBeInTheDocument(); expect(screen.queryByText(/Generated transaction history/)).toBeNull();
        const terminal = ['CANCELLED', 'COMPLETED'].includes(status);
        expect(!!screen.queryByRole('button', { name: 'Cancel rule' })).toBe(!terminal); expect(!!screen.queryByRole('button', { name: 'Pause rule' })).toBe(['ACTIVE', 'BLOCKED'].includes(status)); expect(!!screen.queryByRole('button', { name: 'Resume rule' })).toBe(status === 'PAUSED');
        expect(!!screen.queryByRole('link', { name: 'Repair account/category' })).toBe(status === 'BLOCKED'); expect(!!screen.queryByRole('link', { name: 'Edit rule' })).toBe(['ACTIVE', 'PAUSED'].includes(status));
    });
    it('focuses Keep and Escape restores trigger without invoking a mutation', async () => {
        const user = userEvent.setup(); setup(`/app/recurring/${id}`); const trigger = await screen.findByRole('button', { name: 'Pause rule' }); await user.click(trigger); expect(pauseRecurringTransaction).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Keep current rule' })).toHaveFocus();
        expect(screen.getByText(/paused dates are skipped/)).toBeInTheDocument(); await user.keyboard('{Escape}'); await waitFor(() => expect(trigger).toHaveFocus()); expect(screen.queryByRole('form', { name: 'Pause recurring rule?' })).toBeNull();
    });
    it('pause updates only from its actual response and moves focus to Refresh', async () => {
        setup(`/app/recurring/${id}`); fireEvent.click(await screen.findByRole('button', { name: 'Pause rule' })); fireEvent.click(screen.getByRole('button', { name: 'Confirm pause' })); await screen.findByText('Status: PAUSED'); expect(pauseRecurringTransaction).toHaveBeenCalledExactlyOnceWith(id); await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh rule' })).toHaveFocus());
    });
    it('resume can return COMPLETED without guessing ACTIVE', async () => {
        vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, status: 'PAUSED' }); vi.mocked(resumeRecurringTransaction).mockResolvedValue({ ...rule, status: 'COMPLETED', nextDueDate: null }); setup(`/app/recurring/${id}`); fireEvent.click(await screen.findByRole('button', { name: 'Resume rule' })); expect(resumeRecurringTransaction).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Confirm resume' }));
        await screen.findByText('Status: COMPLETED'); expect(screen.getByText('Next due: No next due date')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Cancel rule' })).toBeNull(); expect(screen.getByRole('status')).toHaveTextContent('Server returned status COMPLETED.');
    });
    it('pausing BLOCKED uses the returned paused cursor and clears its reason only from the response', async () => {
        vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, status: 'BLOCKED', blockedReason: 'ACCOUNT_INACTIVE' }); vi.mocked(pauseRecurringTransaction).mockResolvedValue({ ...rule, status: 'PAUSED', nextDueDate: '2099-02-28' }); setup(`/app/recurring/${id}`); fireEvent.click(await screen.findByRole('button', { name: 'Pause rule' }));
        expect(screen.getByText(/Pausing a blocked rule also replaces backlog recovery/)).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Confirm pause' })); await screen.findByText('Status: PAUSED'); expect(screen.getByText('Next due: 2099-02-28')).toBeInTheDocument(); expect(screen.queryByText('Blocked reason: ACCOUNT_INACTIVE')).toBeNull(); expect(screen.queryByRole('link', { name: 'Repair account/category' })).toBeNull();
    });
    it('failed resume leaves the paused rule and confirmation intact', async () => {
        vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, status: 'PAUSED' }); vi.mocked(resumeRecurringTransaction).mockRejectedValue(new ApiError('References unavailable', 'conflict', 409)); setup(`/app/recurring/${id}`); fireEvent.click(await screen.findByRole('button', { name: 'Resume rule' })); fireEvent.click(screen.getByRole('button', { name: 'Confirm resume' })); await screen.findByText('References unavailable'); expect(screen.getByText('Status: PAUSED')).toBeInTheDocument(); expect(screen.getByRole('form', { name: 'Resume recurring rule?' })).toBeInTheDocument(); expect(resumeRecurringTransaction).toHaveBeenCalledExactlyOnceWith(id);
    });
    it('explicit cancellation returns to filtered list and explains retained transactions', async () => {
        setup(`/app/recurring/${id}?status=ACTIVE&accountId=${accountId}`); fireEvent.click(await screen.findByRole('button', { name: 'Cancel rule' })); expect(cancelRecurringTransaction).not.toHaveBeenCalled(); expect(screen.getByText(/Existing generated transactions remain unchanged. This cannot be resumed/)).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));
        await screen.findByText('Recurring rule cancelled. Existing transactions remain.'); expect(cancelRecurringTransaction).toHaveBeenCalledExactlyOnceWith(id); expect(screen.getByTestId('location')).toHaveTextContent(`/app/recurring?status=ACTIVE&accountId=${accountId}`);
    });
    it.each([new ApiError('Invalid rule', 'validation', 400), new ApiError('Rule missing', 'not-found', 404), new ApiError('Worker conflict', 'conflict', 409), new ApiError('Lifecycle timeout', 'timeout')])('keeps failed lifecycle confirmation/state and never automatically retries', async error => {
        vi.mocked(pauseRecurringTransaction).mockRejectedValue(error); setup(`/app/recurring/${id}`); fireEvent.click(await screen.findByRole('button', { name: 'Pause rule' })); fireEvent.click(screen.getByRole('button', { name: 'Confirm pause' })); await screen.findByText(error.message);
        expect(screen.getByText('Status: ACTIVE')).toBeInTheDocument(); expect(screen.getByRole('form', { name: 'Pause recurring rule?' })).toBeInTheDocument(); expect(pauseRecurringTransaction).toHaveBeenCalledOnce(); fireEvent.click(screen.getByRole('button', { name: 'Keep current rule' })); fireEvent.click(screen.getByRole('button', { name: 'Refresh rule' })); await screen.findByText('Status: ACTIVE'); expect(pauseRecurringTransaction).toHaveBeenCalledOnce();
    });
    it('guards pending lifecycle writes and session replacement against late navigation', async () => {
        let finish!: () => void; vi.mocked(cancelRecurringTransaction).mockReturnValue(new Promise(resolve => { finish = resolve; })); setup(`/app/recurring/${id}`); fireEvent.click(await screen.findByRole('button', { name: 'Cancel rule' })); fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));
        expect(screen.getByRole('button', { name: 'Keep current rule' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Applying…' })).toBeDisabled(); fireEvent.keyDown(screen.getByRole('form', { name: 'Cancel recurring rule?' }), { key: 'Escape' }); fireEvent.submit(screen.getByRole('form', { name: 'Cancel recurring rule?' })); expect(cancelRecurringTransaction).toHaveBeenCalledOnce();
        act(() => loginSession(makeToken(undefined, 'replacement@example.com'))); await screen.findByRole('button', { name: 'Cancel rule' }); await act(async () => finish()); expect(screen.getByTestId('location')).toHaveTextContent(`/app/recurring/${id}`); expect(screen.queryByText('Recurring rule cancelled. Existing transactions remain.')).toBeNull();
    });
    it('supports404 retry and cancels unmounted detail/refresh reads', async () => {
        vi.mocked(getRecurringTransaction).mockRejectedValueOnce(new ApiError('Rule not found', 'not-found', 404)); const view = setup(`/app/recurring/${id}`); await screen.findByText('Rule not found'); fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await screen.findByText('Status: ACTIVE');
        let finish!: (data: RecurringTransactionResponse) => void; vi.mocked(getRecurringTransaction).mockReturnValueOnce(new Promise(resolve => { finish = resolve; })); fireEvent.click(screen.getByRole('button', { name: 'Refresh rule' })); const signal = vi.mocked(getRecurringTransaction).mock.calls.at(-1)![1]!; view.unmount(); expect(signal.aborted).toBe(true); await act(async () => finish({ ...rule, description: 'Late detail' })); expect(screen.queryByText('Late detail')).toBeNull();
    });
    it('blocked cancellation errors remain visible until explicit confirmation retry', async () => {
        vi.mocked(getRecurringTransaction).mockResolvedValue({ ...rule, status: 'BLOCKED', blockedReason: 'CATEGORY_INACTIVE' }); vi.mocked(cancelRecurringTransaction).mockRejectedValueOnce(new ApiError('Cancel conflict', 'conflict', 409)).mockResolvedValueOnce(); setup(`/app/recurring/${id}`);
        fireEvent.click(await screen.findByRole('button', { name: 'Cancel rule' })); fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' })); await screen.findByText('Cancel conflict'); expect(screen.getByText('Status: BLOCKED')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' })); await screen.findByText('Recurring rule cancelled. Existing transactions remain.'); expect(cancelRecurringTransaction).toHaveBeenCalledTimes(2);
    });
    it('no invalid detail filters bypass validation', async () => {
        setup(`/app/recurring/${id}?type=TRANSFER`); expect(await within(screen.getByRole('main')).findByRole('alert')).toBeInTheDocument(); expect(getRecurringTransaction).not.toHaveBeenCalled();
    });
});
