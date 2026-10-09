import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { loginSession, logoutSession } from '../../api/session';
import { makeToken } from '../../test/session';
import { ApiError } from '../../api/errors';
import { getBudget, getBudgets, createBudget, updateBudget, deleteBudget } from '../../services/budgetService';
import { getCategories } from '../../services/categoryService';
import type { BudgetResponse } from '../../types/budget';

vi.mock('../../services/budgetService'); vi.mock('../../services/categoryService');
const id = '9223372036854775807'; const categoryId = '9007199254740993';
const budget: BudgetResponse = { id, categoryId, categoryName: 'Historical rent', year: '2024', month: '2', amount: '99999999999999999.99', spentAmount: '199999999999999999.98', remainingAmount: '-99999999999999999.99', overBudget: true, createdAt: '2024-02-01T00:00:00', updatedAt: '2024-02-01T00:00:00' };
const expenseCategory = { id: categoryId, name: 'Rent', type: 'EXPENSE' as const, active: true, system: true, createdAt: '', updatedAt: '' };
function Location() { const location = useLocation(); const navigate = useNavigate(); return <><span data-testid="location">{location.pathname + location.search}</span><button onClick={() => navigate(-1)}>Browser back</button><button onClick={() => navigate(1)}>Browser forward</button></>; }
function setup(path = '/app/budgets?year=2024&month=2') { return render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /><Location /></AuthProvider></MemoryRouter>); }
beforeEach(() => {
    vi.resetAllMocks(); loginSession(makeToken()); vi.mocked(getBudgets).mockResolvedValue([budget]); vi.mocked(getBudget).mockResolvedValue(budget);
    vi.mocked(createBudget).mockResolvedValue(budget); vi.mocked(updateBudget).mockResolvedValue(budget); vi.mocked(deleteBudget).mockResolvedValue();
    vi.mocked(getCategories).mockResolvedValue([expenseCategory, { ...expenseCategory, id: '2', name: 'Salary', type: 'INCOME' }, { ...expenseCategory, id: '3', name: 'Inactive expense', active: false }, { ...expenseCategory, id: '4', name: 'Custom expense', system: false }]);
});
afterEach(() => { cleanup(); logoutSession(); });
async function fillCreate(amount = '99999999999999999.99') {
    await screen.findByRole('option', { name: 'Rent (System)' }); fireEvent.change(screen.getByLabelText('Category'), { target: { value: categoryId } }); fireEvent.change(screen.getByLabelText('Budget amount (INR)'), { target: { value: amount } });
}

describe('Budget list and period navigation', () => {
    it('shows exact server values, over-budget state, neutral icons and Long detail links', async () => {
        setup(); const link = await screen.findByRole('link', { name: 'Historical rent' });
        expect(link).toHaveAttribute('href', `/app/budgets/${id}?year=2024&month=2`); expect(getBudgets).toHaveBeenCalledWith({ year: '2024', month: '2' }, expect.any(AbortSignal));
        expect(screen.getByText('₹99,99,99,99,99,99,99,999.99')).toBeInTheDocument(); expect(screen.getByText('₹1,99,99,99,99,99,99,99,999.98')).toBeInTheDocument(); expect(screen.getByText('-₹99,99,99,99,99,99,99,999.99')).toBeInTheDocument();
        expect(screen.getByText('Over budget')).toBeInTheDocument(); expect(document.querySelector('.ct-category-icon')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View dashboard' })).toHaveAttribute('href', '/app/dashboard?year=2024&month=2'); expect(screen.getByRole('link', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page');
    });
    it('makes the browser-local default explicit', async () => {
        setup('/app/budgets'); await screen.findByRole('link', { name: 'Historical rent' }); const today = new Date();
        expect(screen.getByTestId('location')).toHaveTextContent(`/app/budgets?year=${today.getFullYear()}&month=${today.getMonth() + 1}`);
    });
    it('normalizes padded valid month fields without silently changing the selected period', async () => {
        setup('/app/budgets?year=0099&month=02'); await screen.findByRole('link', { name: 'Historical rent' });
        expect(screen.getByLabelText('Month')).toHaveValue('2'); expect(screen.getByLabelText('Year')).toHaveValue('99'); expect(getBudgets).toHaveBeenCalledWith({ year: '99', month: '2' }, expect.any(AbortSignal));
    });
    it.each(['year=2024', 'year=0&month=2', 'year=2024&month=13', 'year=2024&month=2&month=3'])('rejects URL %s without requesting', async search => {
        setup(`/app/budgets?${search}`); expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(getBudgets).not.toHaveBeenCalled();
    });
    it('validates form values and supports month history', async () => {
        setup(); await screen.findByRole('link', { name: 'Historical rent' }); fireEvent.change(screen.getByLabelText('Year'), { target: { value: '10000' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply month' }));
        expect(screen.getByLabelText('Year')).toHaveAttribute('aria-invalid', 'true'); expect(getBudgets).toHaveBeenCalledTimes(1);
        fireEvent.change(screen.getByLabelText('Year'), { target: { value: '9999' } }); fireEvent.change(screen.getByLabelText('Month'), { target: { value: '12' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply month' }));
        await waitFor(() => expect(getBudgets).toHaveBeenLastCalledWith({ year: '9999', month: '12' }, expect.any(AbortSignal)));
        fireEvent.click(screen.getByRole('button', { name: 'Browser back' })); await waitFor(() => expect(screen.getByLabelText('Year')).toHaveValue('2024'));
        fireEvent.click(screen.getByRole('button', { name: 'Browser forward' })); await waitFor(() => expect(screen.getByLabelText('Year')).toHaveValue('9999'));
    });
    it('handles loading, read failure, retry, empty and equality without fake amounts', async () => {
        vi.mocked(getBudgets).mockRejectedValueOnce(new ApiError('Offline', 'network')).mockResolvedValueOnce([]); setup();
        expect(screen.getByText('Loading budgets…')).toBeInTheDocument(); await screen.findByText('Offline'); expect(screen.queryByText('Budget limit')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await screen.findByText('No budgets for this month');
        vi.mocked(getBudgets).mockResolvedValue([{ ...budget, spentAmount: budget.amount, remainingAmount: '0.00', overBudget: false }]); fireEvent.click(screen.getByRole('button', { name: 'Refresh budgets' }));
        expect(await screen.findByText('Within budget')).toBeInTheDocument(); expect(screen.getByText('₹0.00')).toBeInTheDocument();
    });
    it('aborts replaced reads and ignores their late results', async () => {
        let finish!: (data: BudgetResponse[]) => void; vi.mocked(getBudgets).mockReturnValueOnce(new Promise(resolve => { finish = resolve; })); setup();
        const signal = vi.mocked(getBudgets).mock.calls[0][1]!; fireEvent.change(screen.getByLabelText('Month'), { target: { value: '3' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply month' }));
        await screen.findByRole('link', { name: 'Historical rent' }); expect(signal.aborted).toBe(true);
        await act(async () => finish([{ ...budget, categoryName: 'Stale result' }])); expect(screen.queryByText('Stale result')).toBeNull();
    });
});

describe('Budget forms and historical details', () => {
    it('creates using active expense categories and exact decimal values', async () => {
        setup('/app/budgets/create?year=2024&month=2'); await fillCreate(); expect(screen.queryByRole('option', { name: /Salary|Inactive expense/ })).toBeNull(); expect(screen.getByRole('option', { name: 'Custom expense (Custom)' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Save budget' })); await screen.findByRole('heading', { name: 'Budget details' });
        expect(createBudget).toHaveBeenCalledExactlyOnceWith({ year: '2024', month: '2', categoryId, amount: '99999999999999999.99' }); expect(screen.getByTestId('location')).toHaveTextContent(`/app/budgets/${id}?year=2024&month=2`);
    });
    it('navigates to the newly created period when the form month changes', async () => {
        vi.mocked(createBudget).mockResolvedValue({ ...budget, month: '3' }); setup('/app/budgets/create?year=2024&month=2'); await fillCreate('0.01'); fireEvent.change(screen.getByLabelText('Month'), { target: { value: '3' } }); fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/${id}?year=2024&month=3`));
    });
    it.each(['0', '-1', '1.001', '100000000000000000'])('preserves invalid amount %s and prevents submission', async amount => {
        setup('/app/budgets/create?year=2024&month=2'); await fillCreate(amount); fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
        expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(screen.getByLabelText('Budget amount (INR)')).toHaveValue(amount); expect(createBudget).not.toHaveBeenCalled();
    });
    it.each([new ApiError('Budget already exists', 'conflict', 409), new ApiError('Validation failed', 'validation', 400, { amount: 'Rejected amount', categoryId: 'Rejected category', unexpected: 'Extra validation' }), new ApiError('Offline', 'network')])('retains failed create inputs and errors', async error => {
        vi.mocked(createBudget).mockRejectedValue(error); setup('/app/budgets/create?year=2024&month=2'); await fillCreate('10.00'); fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
        await screen.findByText(error.message); expect(screen.getByLabelText('Budget amount (INR)')).toHaveValue('10.00'); expect(screen.getByLabelText('Category')).toHaveValue(categoryId); expect(screen.getByLabelText('Year')).toHaveValue('2024');
        if (error.fieldErrors.unexpected) expect(screen.getByText('Extra validation')).toBeInTheDocument();
    });
    it('handles category failure/retry and empty eligible categories', async () => {
        vi.mocked(getCategories).mockRejectedValueOnce(new ApiError('Category network error', 'network')).mockResolvedValueOnce([]); setup('/app/budgets/create?year=2024&month=2');
        await screen.findByText('Category network error'); fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await screen.findByText('No active expense categories'); expect(screen.getByRole('button', { name: 'Save budget' })).toBeDisabled();
    });
    it('retains edits through resource refresh and rejects a category that becomes inactive', async () => {
        setup('/app/budgets/create?year=2024&month=2'); await fillCreate('10.00'); vi.mocked(getCategories).mockResolvedValue([{ ...expenseCategory, active: false }, { ...expenseCategory, id: '4', name: 'Alternative category' }]);
        fireEvent.click(screen.getByRole('button', { name: 'Refresh categories' })); await screen.findByRole('option', { name: 'Alternative category (System)' });
        expect(screen.getByLabelText('Budget amount (INR)')).toHaveValue('10.00'); expect(screen.getByLabelText('Category')).toHaveValue('');
        fireEvent.click(screen.getByRole('button', { name: 'Save budget' })); expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(createBudget).not.toHaveBeenCalled();
    });
    it('edits only amount without fetching categories for an inactive historical reference', async () => {
        setup(`/app/budgets/${id}/edit?year=2024&month=2`); const input = await screen.findByLabelText('Budget amount (INR)'); expect(input).toHaveValue(budget.amount); expect(screen.getByText('Category: Historical rent')).toBeInTheDocument(); expect(getCategories).not.toHaveBeenCalled();
        fireEvent.change(input, { target: { value: '0.01' } }); fireEvent.click(screen.getByRole('button', { name: 'Save budget' })); await screen.findByRole('heading', { name: 'Budget details' }); expect(updateBudget).toHaveBeenCalledExactlyOnceWith(id, { amount: '0.01' });
    });
    it('preserves amount on failed update and retries inaccessible detail reads', async () => {
        vi.mocked(updateBudget).mockRejectedValue(new ApiError('No longer available', 'not-found', 404)); setup(`/app/budgets/${id}/edit`); fireEvent.change(await screen.findByLabelText('Budget amount (INR)'), { target: { value: '0.01' } }); fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
        await screen.findByText('No longer available'); expect(screen.getByLabelText('Budget amount (INR)')).toHaveValue('0.01');
    });
    it('shows detail load failure and retry, using exact leap-month drill-down', async () => {
        vi.mocked(getBudget).mockRejectedValueOnce(new ApiError('Budget not found', 'not-found', 404)).mockResolvedValueOnce(budget); setup(`/app/budgets/${id}`); await screen.findByText('Budget not found'); fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        const link = await screen.findByRole('link', { name: 'View category expenses' }); expect(link).toHaveAttribute('href', `/app/transactions?type=EXPENSE&categoryId=${categoryId}&from=2024-02-01&to=2024-02-29`); expect(screen.getByRole('link', { name: 'Back to budgets' })).toHaveAttribute('href', '/app/budgets?year=2024&month=2');
    });
    it('requires explicit deletion, restores keep focus and retains failed confirmation', async () => {
        const user = userEvent.setup(); vi.mocked(deleteBudget).mockRejectedValueOnce(new ApiError('Delete failed', 'server')).mockResolvedValueOnce(); setup(`/app/budgets/${id}?year=2024&month=2`);
        const trigger = await screen.findByRole('button', { name: 'Delete budget' }); await user.click(trigger); expect(deleteBudget).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Keep budget' })).toHaveFocus();
        await user.keyboard('{Escape}'); await waitFor(() => expect(trigger).toHaveFocus()); expect(screen.queryByText('Delete this budget definition?')).toBeNull();
        await user.click(trigger); await user.click(screen.getByRole('button', { name: 'Confirm budget deletion' })); await screen.findByText('Delete failed'); expect(screen.getByText('Delete this budget definition?')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Confirm budget deletion' })); await screen.findByText('Budget definition deleted. Existing transactions remain.'); expect(deleteBudget).toHaveBeenCalledTimes(2); expect(screen.getByTestId('location')).toHaveTextContent('/app/budgets?year=2024&month=2');
    });
    it('guards duplicate mutation and ignores completion after unmount', async () => {
        let finish!: (data: BudgetResponse) => void; vi.mocked(createBudget).mockReturnValue(new Promise(resolve => { finish = resolve; })); const view = setup('/app/budgets/create?year=2024&month=2'); await fillCreate();
        fireEvent.click(screen.getByRole('button', { name: 'Save budget' })); expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled(); fireEvent.submit(screen.getByLabelText('Budget amount (INR)').closest('form')!); expect(createBudget).toHaveBeenCalledOnce();
        view.unmount(); await act(async () => finish(budget)); expect(getBudget).not.toHaveBeenCalled();
    });
    it('disables repeated deletion and confirmation cancellation while pending', async () => {
        let finish!: () => void; vi.mocked(deleteBudget).mockReturnValue(new Promise(resolve => { finish = resolve; })); setup(`/app/budgets/${id}?year=2024&month=2`);
        fireEvent.click(await screen.findByRole('button', { name: 'Delete budget' })); fireEvent.click(screen.getByRole('button', { name: 'Confirm budget deletion' }));
        expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Keep budget' })).toBeDisabled();
        fireEvent.keyDown(screen.getByRole('button', { name: 'Keep budget' }), { key: 'Escape' }); fireEvent.submit(screen.getByRole('form', { name: 'Delete this budget definition?' }));
        expect(deleteBudget).toHaveBeenCalledOnce(); expect(screen.getByText('Delete this budget definition?')).toBeInTheDocument(); await act(async () => finish());
        await screen.findByText('Budget definition deleted. Existing transactions remain.');
    });
    it('clears a pending save on session replacement without navigating the new owner', async () => {
        let finish!: (data: BudgetResponse) => void; vi.mocked(createBudget).mockReturnValue(new Promise(resolve => { finish = resolve; })); setup('/app/budgets/create?year=2024&month=2'); await fillCreate(); fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
        act(() => loginSession(makeToken(undefined, 'replacement@example.com'))); await screen.findByRole('button', { name: 'Save budget' });
        expect(screen.getByLabelText('Budget amount (INR)')).toHaveValue(''); await act(async () => finish(budget)); expect(screen.getByTestId('location')).toHaveTextContent('/app/budgets/create?year=2024&month=2'); expect(getBudget).not.toHaveBeenCalled();
    });
    it('clears previous-owner budget data on session replacement', async () => {
        setup(); await screen.findByRole('link', { name: 'Historical rent' }); vi.mocked(getBudgets).mockResolvedValue([{ ...budget, categoryName: 'New owner budget' }]);
        act(() => { loginSession(makeToken(undefined, 'next@example.com')); });
        expect(screen.queryByRole('link', { name: 'Historical rent' })).toBeNull(); await screen.findByRole('link', { name: 'New owner budget' });
    });
    it('associates field errors and keeps a single main/heading on invalid edit context', async () => {
        setup(`/app/budgets/${id}/edit?year=2024`); expect(screen.getAllByRole('main')).toHaveLength(1); expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1); expect(getBudget).not.toHaveBeenCalled();
        expect(within(screen.getByRole('main')).getByRole('link', { name: 'Clear invalid period' })).toHaveAttribute('href', `/app/budgets/${id}/edit`);
    });
});
