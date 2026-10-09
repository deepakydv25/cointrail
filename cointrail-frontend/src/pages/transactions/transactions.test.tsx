import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { loginSession, logoutSession } from '../../api/session';
import { makeToken } from '../../test/session';
import { ApiError } from '../../api/errors';
import * as service from '../../services/transactionService';
import { getAccounts } from '../../services/accountService';
import { getCategories } from '../../services/categoryService';
import type { TransactionResponse, TransactionPage } from '../../types/transaction';

vi.mock('../../services/transactionService', async importOriginal => ({ ...await importOriginal<typeof import('../../services/transactionService')>(),
    getTransactions: vi.fn(), getTransaction: vi.fn(), createTransaction: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn() }));
vi.mock('../../services/accountService'); vi.mock('../../services/categoryService');
const id = '9007199254740993'; const accountId = '9007199254740994'; const categoryId = '9007199254740995';
const transaction: TransactionResponse = { id, type: 'EXPENSE', amount: '99999999999999999.99', description: 'Dinner', transactionDate: '2026-10-01',
    accountId, accountName: 'Bank', categoryId, categoryName: 'Food', createdAt: '2026-10-01T12:00:00', updatedAt: '2026-10-01T12:00:00' };
const page: TransactionPage = { content: [transaction], number: '0', size: '20', totalElements: '21', totalPages: '2' };
function Location() { const location = useLocation(); return <p data-testid="location">{location.pathname + location.search}</p>; }
function renderPage(path: string) { render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /><Location /></AuthProvider></MemoryRouter>); }
async function readyForm() { await screen.findByLabelText('Amount (INR)'); await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()); }
beforeEach(() => {
    vi.resetAllMocks(); loginSession(makeToken());
    vi.mocked(getAccounts).mockResolvedValue([{ id: accountId, name: 'Bank', type: 'BANK', openingBalance: '0', active: true, createdAt: transaction.createdAt, updatedAt: transaction.updatedAt }]);
    vi.mocked(getCategories).mockResolvedValue([
        { id: categoryId, name: 'Food', type: 'EXPENSE', system: true, active: true, createdAt: transaction.createdAt, updatedAt: transaction.updatedAt },
        { id: '9007199254740996', name: 'Salary', type: 'INCOME', system: true, active: true, createdAt: transaction.createdAt, updatedAt: transaction.updatedAt },
    ]);
    vi.mocked(service.getTransactions).mockResolvedValue(page); vi.mocked(service.getTransaction).mockResolvedValue(transaction);
    const save = async (request: Parameters<typeof service.createTransaction>[0]) => {
        const saved = { ...transaction, ...request, categoryName: request.type === 'INCOME' ? 'Salary' : 'Food' };
        vi.mocked(service.getTransaction).mockResolvedValue(saved);
        return saved;
    };
    vi.mocked(service.createTransaction).mockImplementation(save);
    vi.mocked(service.updateTransaction).mockImplementation(async (_id, request) => save(request));
    vi.mocked(service.deleteTransaction).mockResolvedValue();
});
afterEach(() => { cleanup(); logoutSession(); });

describe('transaction forms and history', () => {
    it.each(['EXPENSE', 'INCOME'] as const)('creates %s with exact money, IDs and preserved filters', async type => {
        const user = userEvent.setup(); renderPage('/app/transactions/create?type=INCOME&sort=amount,asc&page=2'); await readyForm();
        await user.selectOptions(screen.getByLabelText('Type'), type);
        await user.selectOptions(screen.getByLabelText('Account'), accountId);
        expect(screen.queryByRole('option', { name: type === 'EXPENSE' ? 'Salary (System)' : 'Food (System)' })).not.toBeInTheDocument();
        const selectedCategory = type === 'EXPENSE' ? categoryId : '9007199254740996';
        await user.selectOptions(screen.getByLabelText('Category'), selectedCategory);
        fireEvent.change(screen.getByLabelText('Amount (INR)'), { target: { value: '99999999999999999.99' } });
        fireEvent.change(screen.getByLabelText('Transaction date'), { target: { value: '2026-10-01' } });
        await user.click(screen.getByRole('button', { name: 'Save transaction' }));
        await screen.findByRole('heading', { name: 'Transaction details' });
        expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(type);
        expect(screen.getByText(`Category: ${type === 'INCOME' ? 'Salary' : 'Food'}`)).toBeInTheDocument();
        expect(service.createTransaction).toHaveBeenCalledWith({ type, accountId, categoryId: selectedCategory, amount: transaction.amount, description: null, transactionDate: '2026-10-01' });
        expect(screen.getByTestId('location')).toHaveTextContent(`/app/transactions/${id}?type=INCOME&sort=amount,asc&page=2`);
    }, 10_000); // Full create/navigation journey across the expanded shell; keep every contract assertion.
    it('clears the category when transaction type changes', async () => {
        const user = userEvent.setup(); renderPage('/app/transactions/create'); await readyForm();
        await user.selectOptions(screen.getByLabelText('Category'), categoryId); await user.selectOptions(screen.getByLabelText('Type'), 'INCOME');
        expect(screen.getByLabelText('Category')).toHaveValue('');
        expect(screen.queryByRole('option', { name: 'Food (System)' })).not.toBeInTheDocument();
    });
    it.each(['0', '-0.01', '1.234', '100000000000000000'])('rejects invalid amount %s and retains inputs', async amount => {
        const user = userEvent.setup(); renderPage('/app/transactions/create'); await readyForm();
        await user.type(screen.getByLabelText('Amount (INR)'), amount); await user.click(screen.getByRole('button', { name: 'Save transaction' }));
        expect(screen.getByLabelText('Amount (INR)')).toHaveValue(amount);
        expect(screen.getByLabelText('Amount (INR)')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Account')).toHaveAccessibleDescription('Choose an active account.');
        expect(screen.getByLabelText('Category')).toHaveAccessibleDescription('Choose an active expense category.');
        expect(screen.getByLabelText('Transaction date')).toHaveAccessibleDescription(/Enter a valid transaction date/);
        expect(service.createTransaction).not.toHaveBeenCalled();
    });
    it('requires replacement resources while displaying historical names and retains null description', async () => {
        vi.mocked(service.getTransaction).mockResolvedValue({ ...transaction, accountId: '1', accountName: 'Old bank', categoryId: '2', categoryName: 'Old food', description: null });
        const user = userEvent.setup(); renderPage(`/app/transactions/${id}/edit?accountId=1&page=1`); await readyForm();
        expect(screen.getByText('Recorded account: Old bank')).toBeInTheDocument(); expect(screen.getByText('Recorded category: Old food')).toBeInTheDocument();
        expect(screen.getByLabelText('Account')).toHaveValue(''); expect(screen.getByLabelText('Category')).toHaveValue('');
        expect(screen.queryByRole('option', { name: 'Old bank' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Save transaction' })); expect(service.updateTransaction).not.toHaveBeenCalled();
        await user.selectOptions(screen.getByLabelText('Account'), accountId); await user.selectOptions(screen.getByLabelText('Category'), categoryId);
        await user.click(screen.getByRole('button', { name: 'Save transaction' })); await screen.findByRole('heading', { name: 'Transaction details' });
        expect(service.updateTransaction).toHaveBeenCalledWith(id, { accountId, categoryId, type: 'EXPENSE', amount: transaction.amount, description: null, transactionDate: transaction.transactionDate });
    });
    it('allows a full replacement edit including type, amount, date and description', async () => {
        const user = userEvent.setup(); renderPage(`/app/transactions/${id}/edit`); await readyForm();
        await user.selectOptions(screen.getByLabelText('Type'), 'INCOME'); await user.selectOptions(screen.getByLabelText('Category'), '9007199254740996');
        await user.clear(screen.getByLabelText('Amount (INR)')); await user.type(screen.getByLabelText('Amount (INR)'), '0.01');
        await user.clear(screen.getByLabelText('Description (optional)')); await user.type(screen.getByLabelText('Description (optional)'), 'Bonus');
        fireEvent.change(screen.getByLabelText('Transaction date'), { target: { value: '2026-01-01' } });
        await user.click(screen.getByRole('button', { name: 'Save transaction' }));
        await screen.findByRole('heading', { name: 'Transaction details' });
        expect(service.updateTransaction).toHaveBeenCalledWith(id, { accountId, categoryId: '9007199254740996', type: 'INCOME', amount: '0.01', description: 'Bonus', transactionDate: '2026-01-01' });
        expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('INCOME · ₹0.01');
        expect(screen.getByText('Description: Bonus')).toBeInTheDocument();
    });
    it.each([400, 409, 404, 500])('retains edits after authoritative HTTP %s failure', async status => {
        vi.mocked(service.updateTransaction).mockRejectedValue(new ApiError('Request rejected', status === 400 ? 'validation' : status === 409 ? 'conflict' : status === 404 ? 'not-found' : 'server', status,
            status === 400 ? { transactionDate: 'Date must be today or earlier' } : {}));
        const user = userEvent.setup(); renderPage(`/app/transactions/${id}/edit`); await readyForm();
        fireEvent.change(screen.getByLabelText('Transaction date'), { target: { value: '2099-01-01' } });
        await user.click(screen.getByRole('button', { name: 'Save transaction' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Request rejected');
        expect(screen.getByLabelText('Amount (INR)')).toHaveValue(transaction.amount); expect(screen.getByLabelText('Transaction date')).toHaveValue('2099-01-01');
        expect(screen.getByLabelText('Description (optional)')).toHaveValue('Dinner');
        if (status === 400) expect(screen.getByLabelText('Transaction date')).toHaveAccessibleDescription(/today or earlier/);
    });
    it('shows resource onboarding and preserves inputs on eligible resource refresh', async () => {
        vi.mocked(getAccounts).mockResolvedValueOnce([]); vi.mocked(getCategories).mockResolvedValueOnce([]);
        const user = userEvent.setup(); renderPage('/app/transactions/create'); await readyForm();
        expect(screen.getByRole('link', { name: 'Create an account' })).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Create a custom category' })).toBeInTheDocument();
        await user.type(screen.getByLabelText('Amount (INR)'), '0.01'); await user.click(screen.getByRole('button', { name: 'Refresh eligible resources' }));
        await screen.findByRole('option', { name: 'Bank' }); expect(screen.getByLabelText('Amount (INR)')).toHaveValue('0.01');
    });
    it('handles resource loading failure and retry', async () => {
        vi.mocked(getAccounts).mockRejectedValueOnce(new ApiError('Offline', 'network'));
        renderPage('/app/transactions/create'); expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
        fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await readyForm();
    });
    it('preserves complete creation inputs after a network failure', async () => {
        vi.mocked(service.createTransaction).mockRejectedValue(new ApiError('Network unavailable', 'network'));
        const user = userEvent.setup(); renderPage('/app/transactions/create'); await readyForm();
        await user.selectOptions(screen.getByLabelText('Account'), accountId); await user.selectOptions(screen.getByLabelText('Category'), categoryId);
        await user.type(screen.getByLabelText('Amount (INR)'), '0.01'); await user.type(screen.getByLabelText('Description (optional)'), 'Keep this');
        fireEvent.change(screen.getByLabelText('Transaction date'), { target: { value: '2026-01-01' } });
        await user.click(screen.getByRole('button', { name: 'Save transaction' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
        expect(screen.getByLabelText('Account')).toHaveValue(accountId); expect(screen.getByLabelText('Category')).toHaveValue(categoryId);
        expect(screen.getByLabelText('Amount (INR)')).toHaveValue('0.01'); expect(screen.getByLabelText('Description (optional)')).toHaveValue('Keep this');
        expect(screen.getByLabelText('Transaction date')).toHaveValue('2026-01-01'); expect(screen.getByRole('button', { name: 'Save transaction' })).toBeEnabled();
    });
    it('ignores late successful saves after leaving the form', async () => {
        let complete!: () => void; vi.mocked(service.updateTransaction).mockImplementation(() => new Promise(resolve => { complete = () => resolve(transaction); }));
        const user = userEvent.setup(); renderPage(`/app/transactions/${id}/edit`); await readyForm();
        await user.click(screen.getByRole('button', { name: 'Save transaction' })); expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
        await user.click(screen.getByRole('link', { name: 'Transactions' })); await screen.findByRole('link', { name: 'Dinner' });
        await act(async () => complete()); expect(screen.getByTestId('location')).toHaveTextContent('/app/transactions');
        expect(screen.queryByRole('heading', { name: 'Transaction details' })).not.toBeInTheDocument();
    });
});

describe('transaction list, detail and deletion', () => {
    it.each(['INCOME', 'EXPENSE'] as const)('keeps the full %s amount and tone on details', async type => {
        vi.mocked(service.getTransaction).mockResolvedValue({ ...transaction, type });
        renderPage(`/app/transactions/${id}`);
        expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(`${type} · ₹99,99,99,99,99,99,99,999.99`);
        expect(screen.getByText('₹99,99,99,99,99,99,99,999.99')).toHaveClass(`ct-amount--${type.toLowerCase()}`);
    });
    it.each(['INCOME', 'EXPENSE'] as const)('shows complete %s amounts with a text label and neutral category icon', async type => {
        vi.mocked(service.getTransactions).mockResolvedValue({ ...page, content: [{ ...transaction, type }] });
        renderPage('/app/transactions');
        expect(await screen.findByRole('link', { name: 'Dinner' })).toHaveAttribute('href', `/app/transactions/${id}`);
        expect(screen.getByText('₹99,99,99,99,99,99,99,999.99')).toHaveClass(`ct-amount--${type.toLowerCase()}`);
        expect(screen.getByText(type, { selector: '.ct-badge' })).toBeInTheDocument();
        expect(document.querySelector('.ct-category-icon')).toHaveAttribute('aria-hidden', 'true');
    });
    it('lists historical names, exact amounts and preserved query links', async () => {
        renderPage('/app/transactions?type=EXPENSE&accountId=1&page=1&sort=amount,desc');
        expect(await screen.findByRole('link', { name: 'Dinner' })).toHaveAttribute('href', `/app/transactions/${id}?type=EXPENSE&accountId=1&page=1&sort=amount,desc`);
        expect(screen.getByText(/₹99,99,99,99,99,99,99,999.99/)).toBeInTheDocument(); expect(screen.getByText('Account: Bank')).toBeInTheDocument();
        expect(service.getTransactions).toHaveBeenCalledWith(expect.objectContaining({ type: 'EXPENSE', accountId: '1', page: '1', sort: 'amount,desc' }), expect.any(AbortSignal));
        expect(screen.getByRole('option', { name: /Historical or unavailable account/ })).toHaveValue('1');
    });
    it('applies filters/sort, resets page and requests server pagination', async () => {
        const user = userEvent.setup(); renderPage('/app/transactions?page=3'); await screen.findByRole('link', { name: 'Dinner' });
        await user.selectOptions(screen.getByLabelText('Type'), 'INCOME'); await user.selectOptions(screen.getByLabelText('Account'), accountId);
        await user.selectOptions(screen.getByLabelText('Category'), '9007199254740996');
        await user.selectOptions(screen.getByLabelText('Sort'), 'updatedAt,asc'); await user.selectOptions(screen.getByLabelText('Page size'), '100');
        fireEvent.change(screen.getByLabelText('From date (inclusive)'), { target: { value: '2026-01-01' } });
        fireEvent.change(screen.getByLabelText('To date (inclusive)'), { target: { value: '2026-10-01' } });
        await user.click(screen.getByRole('button', { name: 'Apply filters' }));
        await waitFor(() => expect(service.getTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'INCOME', accountId, categoryId: '9007199254740996', from: '2026-01-01', to: '2026-10-01', page: '0', size: '100', sort: 'updatedAt,asc' }), expect.any(AbortSignal)));
        await screen.findByRole('link', { name: 'Dinner' }); await user.click(screen.getByRole('button', { name: 'Next page' }));
        await waitFor(() => expect(service.getTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ page: '1', sort: 'updatedAt,asc' }), expect.any(AbortSignal)));
        await user.click(screen.getByRole('button', { name: 'Clear filters' }));
        await waitFor(() => expect(service.getTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ page: '0', size: '20', sort: 'transactionDate,desc' }), expect.any(AbortSignal)));
    });
    it('shows empty results for unknown IDs, keeps previous-page recovery and disallows next page', async () => {
        vi.mocked(service.getTransactions).mockResolvedValue({ ...page, content: [], number: '5', totalElements: '0', totalPages: '0' });
        renderPage('/app/transactions?accountId=9223372036854775807&page=5');
        expect(await screen.findByRole('heading', { name: 'No transactions' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
        expect(screen.getByText(/No result pages/)).toBeInTheDocument();
    });
    it('retains a valid custom page size when applying filters', async () => {
        const user = userEvent.setup(); renderPage('/app/transactions?size=7'); await screen.findByRole('link', { name: 'Dinner' });
        expect(screen.getByLabelText('Page size')).toHaveValue('7');
        await user.click(screen.getByRole('button', { name: 'Apply filters' }));
        await waitFor(() => expect(service.getTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ size: '7', page: '0' }), expect.any(AbortSignal)));
    });
    it('handles list errors without losing filters and retries', async () => {
        vi.mocked(service.getTransactions).mockRejectedValueOnce(new ApiError('Offline', 'network')); renderPage('/app/transactions?type=INCOME');
        expect(await screen.findByRole('alert')).toHaveTextContent('Offline'); expect(screen.getByLabelText('Type')).toHaveValue('INCOME');
        fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await screen.findByRole('link', { name: 'Dinner' });
    });
    it('rejects reversed dates without dispatch and lets users clear invalid filters', async () => {
        renderPage('/app/transactions?from=2026-10-02&to=2026-10-01'); expect(await screen.findByRole('alert')).toHaveTextContent('Check your transaction filters');
        expect(service.getTransactions).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Clear filters' })); await screen.findByRole('link', { name: 'Dinner' });
    });
    it('discards stale filtered reads while filters remain usable during loading', async () => {
        let resolve!: (data: TransactionPage) => void;
        vi.mocked(service.getTransactions).mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue({ ...page, content: [{ ...transaction, type: 'INCOME', description: 'Salary record' }] });
        const user = userEvent.setup(); renderPage('/app/transactions'); expect(screen.getByText('Loading transactions…')).toBeInTheDocument();
        await user.selectOptions(screen.getByLabelText('Type'), 'INCOME'); await user.click(screen.getByRole('button', { name: 'Apply filters' }));
        await screen.findByRole('link', { name: 'Salary record' }); await act(async () => resolve(page));
        expect(screen.queryByRole('link', { name: 'Dinner' })).not.toBeInTheDocument();
    });
    it('keeps queries through detail/edit/cancel/back navigation without invented origin metadata', async () => {
        const user = userEvent.setup(); renderPage(`/app/transactions/${id}?categoryId=2&page=1`);
        await user.click(await screen.findByRole('link', { name: 'Edit transaction' })); await readyForm();
        await user.click(screen.getByRole('link', { name: 'Cancel' })); await screen.findByRole('link', { name: 'Edit transaction' });
        expect(screen.queryByText(/Generated transaction|Manual transaction/)).not.toBeInTheDocument();
        await user.click(screen.getByRole('link', { name: 'Back to transactions' })); await screen.findByRole('link', { name: 'Dinner' });
        expect(screen.getByTestId('location')).toHaveTextContent('/app/transactions?categoryId=2&page=1');
    });
    it('requires explicit deletion, supports cancellation focus and returns to refreshed filters', async () => {
        const user = userEvent.setup(); renderPage(`/app/transactions/${id}?type=EXPENSE&page=1`);
        await user.click(await screen.findByRole('button', { name: 'Delete transaction' })); expect(service.deleteTransaction).not.toHaveBeenCalled();
        expect(screen.getByText(/will not be regenerated/)).toBeInTheDocument(); await user.click(screen.getByRole('button', { name: 'Keep transaction' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Delete transaction' })).toHaveFocus());
        vi.mocked(service.getTransactions).mockResolvedValue({ ...page, content: [], totalElements: '0', totalPages: '0', number: '1' });
        await user.click(screen.getByRole('button', { name: 'Delete transaction' })); await user.click(screen.getByRole('button', { name: 'Confirm permanent deletion' }));
        await screen.findByRole('heading', { name: 'No transactions' }); expect(service.deleteTransaction).toHaveBeenCalledWith(id);
        expect(screen.queryByRole('link', { name: 'Dinner' })).not.toBeInTheDocument();
        expect(screen.getByTestId('location')).toHaveTextContent('/app/transactions?type=EXPENSE&page=1');
        expect(screen.getByText('Transaction permanently deleted.')).toBeInTheDocument();
    });
    it.each([404, 409, 500])('keeps details and confirmation on deletion failure %s', async status => {
        vi.mocked(service.deleteTransaction).mockRejectedValue(new ApiError('Unable to delete', status === 404 ? 'not-found' : status === 409 ? 'conflict' : 'server', status));
        const user = userEvent.setup(); renderPage(`/app/transactions/${id}`); await user.click(await screen.findByRole('button', { name: 'Delete transaction' }));
        await user.click(screen.getByRole('button', { name: 'Confirm permanent deletion' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to delete'); expect(screen.getByRole('button', { name: 'Confirm permanent deletion' })).toBeEnabled();
    });
    it.each(['', '/edit'])('handles inaccessible transaction 404 (%s)', async suffix => {
        vi.mocked(service.getTransaction).mockRejectedValue(new ApiError('Transaction not found', 'not-found', 404)); renderPage(`/app/transactions/${id}${suffix}`);
        expect(await screen.findByRole('alert')).toHaveTextContent('Transaction not found'); expect(screen.queryByRole('button', { name: 'Save transaction' })).not.toBeInTheDocument();
    });
    it('clears previous owner data on a session change', async () => {
        renderPage('/app/transactions'); await screen.findByRole('link', { name: 'Dinner' });
        vi.mocked(service.getTransactions).mockResolvedValue({ ...page, content: [{ ...transaction, description: 'Other owner' }] });
        act(() => loginSession(makeToken(undefined, 'other@example.com')));
        expect(screen.queryByRole('link', { name: 'Dinner' })).not.toBeInTheDocument(); await screen.findByRole('link', { name: 'Other owner' });
    });
});
