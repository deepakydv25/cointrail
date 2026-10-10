import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';
import { loginSession, logoutSession } from '../api/session';
import { ApiError } from '../api/errors';
import { makeToken } from '../test/session';
import * as accounts from '../services/accountService';
import * as categories from '../services/categoryService';
import type { AccountResponse } from '../types/account';
import type { CategoryResponse } from '../types/category';

vi.mock('../services/accountService');
vi.mock('../services/categoryService');
const id = '9007199254740993';
const account: AccountResponse = { id, name: 'Savings', type: 'BANK', openingBalance: '-99999999999999999.99', active: true, createdAt: '2026-10-09T12:00:00', updatedAt: '2026-10-09T12:00:00' };
const category: CategoryResponse = { id, name: 'Lunch', type: 'EXPENSE', system: false, active: true, createdAt: account.createdAt, updatedAt: account.updatedAt };
function Location() { const { pathname } = useLocation(); return <p data-testid="location">{pathname}</p>; }
function renderPage(path: string) { return render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /><Location /></AuthProvider></MemoryRouter>); }
async function waitForRouteFocus() {
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus());
}
beforeEach(() => {
    vi.resetAllMocks(); loginSession(makeToken());
    vi.mocked(accounts.getAccounts).mockResolvedValue([account]);
    vi.mocked(accounts.getAccount).mockResolvedValue(account);
    vi.mocked(accounts.createAccount).mockImplementation(async request => ({ ...account, ...request }));
    vi.mocked(accounts.updateAccount).mockImplementation(async (_id, request) => ({ ...account, ...request }));
    vi.mocked(accounts.deactivateAccount).mockResolvedValue();
    vi.mocked(categories.getCategories).mockResolvedValue([category]);
    vi.mocked(categories.getCategory).mockResolvedValue(category);
    vi.mocked(categories.createCategory).mockImplementation(async request => ({ ...category, ...request }));
    vi.mocked(categories.updateCategory).mockImplementation(async (_id, request) => ({ ...category, ...request }));
    vi.mocked(categories.deactivateCategory).mockResolvedValue();
});
afterEach(() => { cleanup(); logoutSession(); });

describe('Accounts', () => {
    it('cancels deactivation with Escape, restores focus and preserves the account', async () => {
        renderPage(`/app/accounts/${id}`);
        const trigger = await screen.findByRole('button', { name: 'Deactivate account' });
        fireEvent.click(trigger);
        await waitFor(() => expect(screen.getByRole('button', { name: 'Keep account active' })).toHaveFocus());
        fireEvent.keyDown(screen.getByRole('button', { name: 'Keep account active' }), { key: 'Escape' });
        await waitFor(() => expect(trigger).toHaveFocus());
        expect(accounts.deactivateAccount).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: 'Confirm deactivation' })).toBeNull();
    });
    it('lists active accounts, exact IDs and opening balances with account-first navigation', async () => {
        vi.mocked(accounts.getAccounts).mockResolvedValue([account, { ...account, id: '2', name: 'Cash', type: 'CASH', openingBalance: '0.01' }]);
        renderPage('/app/accounts');
        expect(await screen.findByRole('link', { name: 'Savings' })).toHaveAttribute('href', `/app/accounts/${id}`);
        expect(screen.getByText('Total opening balances')).toBeInTheDocument();
        expect(document.querySelector('.ct-account-total .ct-metric')).toHaveTextContent('-₹99,99,99,99,99,99,99,999.98');
        expect(screen.getAllByText('Opening balance')).toHaveLength(2);
        expect(screen.getByRole('link', { name: 'Cash' })).toHaveAttribute('href', '/app/accounts/2');
        expect(screen.getByRole('link', { name: 'Expense records' })).toHaveAttribute('href', '/expenses');
        expect(screen.queryByRole('link', { name: 'Review categories' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('aria-current', 'page');
    });
    it('shows onboarding when there are no active accounts', async () => {
        vi.mocked(accounts.getAccounts).mockResolvedValue([]); renderPage('/app/accounts');
        expect(await screen.findByRole('heading', { name: 'No accounts yet' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '+ Add account' })).toBeInTheDocument();
    });
    it('shows loading and retries a failed active list', async () => {
        vi.mocked(accounts.getAccounts).mockRejectedValueOnce(new ApiError('Network unavailable', 'network'));
        renderPage('/app/accounts'); expect(screen.getByRole('status')).toHaveTextContent('Loading accounts');
        expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByRole('link', { name: 'Savings' })).toBeInTheDocument();
    });
    it.each(['99999999999999999.99', '-99999999999999999.99', '0.01', '0'])('creates with exact decimal input %s', async balance => {
        vi.mocked(accounts.getAccount).mockResolvedValue({ ...account, type: 'CREDIT_CARD', openingBalance: balance });
        const user = userEvent.setup(); renderPage('/app/accounts/create');
        await waitForRouteFocus();
        await user.type(screen.getByLabelText('Name'), 'Savings');
        await user.selectOptions(screen.getByLabelText('Type'), 'CREDIT_CARD');
        await user.clear(screen.getByLabelText('Opening balance (INR)'));
        await user.type(screen.getByLabelText('Opening balance (INR)'), balance);
        await user.click(screen.getByRole('button', { name: 'Save account' }));
        await screen.findByRole('heading', { name: 'Account details' });
        expect(accounts.createAccount).toHaveBeenCalledWith({ name: 'Savings', type: 'CREDIT_CARD', openingBalance: balance });
        expect(screen.getByTestId('location')).toHaveTextContent(`/app/accounts/${id}`);
    });
    it.each(['1.234', '100000000000000000'])('rejects balance %s without rounding or losing input', async balance => {
        const user = userEvent.setup(); renderPage('/app/accounts/create');
        await waitForRouteFocus();
        await user.type(screen.getByLabelText('Name'), 'Savings');
        await user.clear(screen.getByLabelText('Opening balance (INR)')); await user.type(screen.getByLabelText('Opening balance (INR)'), balance);
        await user.click(screen.getByRole('button', { name: 'Save account' }));
        expect(screen.getByLabelText('Opening balance (INR)')).toHaveValue(balance);
        expect(screen.getByLabelText('Opening balance (INR)')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Opening balance (INR)')).toHaveAccessibleDescription(/17 integer digits and 2 decimal places/);
        expect(accounts.createAccount).not.toHaveBeenCalled();
    });
    it('validates a blank name before making a request', async () => {
        renderPage('/app/accounts/create'); fireEvent.click(screen.getByRole('button', { name: 'Save account' }));
        expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Enter a name with at most 100 characters.');
        expect(accounts.createAccount).not.toHaveBeenCalled();
    });
    it.each([400, 409, 500])('preserves inputs after a create failure (%s)', async status => {
        vi.mocked(accounts.createAccount).mockRejectedValue(new ApiError('Cannot save', status === 409 ? 'conflict' : status === 400 ? 'validation' : 'server', status, status === 400 ? { name: 'Name rejected' } : {}));
        const user = userEvent.setup(); renderPage('/app/accounts/create');
        await waitForRouteFocus();
        await user.type(screen.getByLabelText('Name'), 'Reserved name');
        await user.click(screen.getByRole('button', { name: 'Save account' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Cannot save');
        expect(screen.getByLabelText('Name')).toHaveValue('Reserved name');
        expect(screen.getByLabelText('Opening balance (INR)')).toHaveValue('0');
        expect(screen.getByRole('button', { name: 'Save account' })).toBeEnabled();
        if (status === 400) expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Name rejected');
    });
    it('edits only name/type, including inactive accounts', async () => {
        vi.mocked(accounts.getAccount).mockResolvedValueOnce({ ...account, active: false }).mockResolvedValue({ ...account, name: 'Wallet', type: 'WALLET', active: false });
        vi.mocked(accounts.updateAccount).mockImplementation(async (_id, request) => ({ ...account, ...request, active: false }));
        const user = userEvent.setup(); renderPage(`/app/accounts/${id}/edit`);
        await waitForRouteFocus();
        expect(await screen.findByText(/Inactive account — editing does not reactivate it/)).toBeInTheDocument();
        expect(screen.queryByLabelText('Opening balance (INR)')).not.toBeInTheDocument();
        await user.clear(screen.getByLabelText('Name')); await user.type(screen.getByLabelText('Name'), 'Wallet');
        await user.selectOptions(screen.getByLabelText('Type'), 'WALLET');
        await user.click(screen.getByRole('button', { name: 'Save account' }));
        await screen.findByRole('heading', { name: 'Account details' });
        expect(accounts.updateAccount).toHaveBeenCalledWith(id, { name: 'Wallet', type: 'WALLET' });
        expect(await screen.findByRole('heading', { name: 'Wallet' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Deactivate account' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Restore/ })).not.toBeInTheDocument();
    });
    it('preserves an edit after a duplicate conflict', async () => {
        vi.mocked(accounts.updateAccount).mockRejectedValue(new ApiError('Account with this name already exists', 'conflict', 409));
        const user = userEvent.setup(); renderPage(`/app/accounts/${id}/edit`);
        await waitForRouteFocus();
        await user.clear(await screen.findByLabelText('Name')); await user.type(screen.getByLabelText('Name'), 'Taken');
        await user.click(screen.getByRole('button', { name: 'Save account' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('already exists'); expect(screen.getByLabelText('Name')).toHaveValue('Taken');
    });
    it('requires confirmation, supports cancellation and refetches authoritative inactive detail', async () => {
        const user = userEvent.setup(); renderPage(`/app/accounts/${id}`);
        await user.click(await screen.findByRole('button', { name: 'Deactivate account' }));
        expect(accounts.deactivateAccount).not.toHaveBeenCalled();
        expect(screen.getByText(/Existing financial history remains/)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Keep account active' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Deactivate account' })).toHaveFocus());
        expect(screen.queryByRole('button', { name: 'Confirm deactivation' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Deactivate account' }));
        vi.mocked(accounts.getAccount).mockResolvedValue({ ...account, active: false });
        await user.click(screen.getByRole('button', { name: 'Confirm deactivation' }));
        expect(await screen.findByText(/Inactive — financial history is preserved/)).toBeInTheDocument();
        expect(accounts.deactivateAccount).toHaveBeenCalledWith(id);
        expect(accounts.getAccount).toHaveBeenCalledTimes(2);
        expect(screen.queryByRole('button', { name: 'Deactivate account' })).not.toBeInTheDocument();
    });
    it('keeps confirmation and details after a failed deactivation', async () => {
        vi.mocked(accounts.deactivateAccount).mockRejectedValue(new ApiError('Unable to deactivate', 'network'));
        const user = userEvent.setup(); renderPage(`/app/accounts/${id}`);
        await user.click(await screen.findByRole('button', { name: 'Deactivate account' }));
        await user.click(screen.getByRole('button', { name: 'Confirm deactivation' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to deactivate');
        expect(screen.getByRole('button', { name: 'Confirm deactivation' })).toBeEnabled();
        expect(screen.getByRole('heading', { name: 'Savings' })).toBeInTheDocument();
    });
    it.each(['', '/edit'])('handles inaccessible account 404 on detail%s', async suffix => {
        vi.mocked(accounts.getAccount).mockRejectedValue(new ApiError('Account not found', 'not-found', 404));
        renderPage(`/app/accounts/${id}${suffix}`);
        expect(await screen.findByRole('alert')).toHaveTextContent('Account not found');
        expect(screen.queryByRole('button', { name: /Save account|Deactivate account/ })).not.toBeInTheDocument();
    });
});

describe('Categories', () => {
    it('lists system/custom categories, distinguishes badges and filters by type', async () => {
        vi.mocked(categories.getCategories).mockResolvedValue([{ ...category, id: '1', name: 'Food', system: true }, category, { ...category, id: '2', name: 'Salary', type: 'INCOME' }]);
        const user = userEvent.setup(); renderPage('/app/categories');
        await screen.findByRole('link', { name: 'Food' }); expect(screen.getByText('System · Read-only')).toBeInTheDocument();
        expect(screen.getAllByText('Custom')).toHaveLength(1);
        expect(screen.getByRole('link', { name: 'Lunch' })).toHaveAttribute('href', `/app/categories/${id}`);
        await user.click(screen.getByRole('tab', { name: 'Income' }));
        expect(screen.queryByRole('link', { name: 'Lunch' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Salary' })).toBeInTheDocument();
    });
    it('renders an empty list and retries errors', async () => {
        vi.mocked(categories.getCategories).mockRejectedValueOnce(new ApiError('Offline', 'network')).mockResolvedValue([]);
        renderPage('/app/categories'); expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByRole('heading', { name: 'No expense categories' })).toBeInTheDocument();
    });
    it.each(['EXPENSE', 'INCOME'] as const)('creates a custom %s category', async type => {
        vi.mocked(categories.getCategory).mockResolvedValue({ ...category, type });
        const user = userEvent.setup(); renderPage('/app/categories/create');
        await waitForRouteFocus();
        await user.type(screen.getByLabelText('Name'), 'Lunch'); await user.selectOptions(screen.getByLabelText('Type'), type);
        await user.click(screen.getByRole('button', { name: 'Save category' }));
        await screen.findByRole('heading', { name: 'Category details' });
        expect(categories.createCategory).toHaveBeenCalledWith({ name: 'Lunch', type });
        expect(await screen.findByText(`Type (immutable): ${type}`)).toBeInTheDocument();
        expect(screen.getByTestId('location')).toHaveTextContent(`/app/categories/${id}`);
    });
    it('validates custom category name before dispatch', async () => {
        renderPage('/app/categories/create'); fireEvent.click(screen.getByRole('button', { name: 'Save category' }));
        expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true'); expect(categories.createCategory).not.toHaveBeenCalled();
    });
    it.each([400, 409, 500])('preserves category form input on failure (%s)', async status => {
        vi.mocked(categories.createCategory).mockRejectedValue(new ApiError('Cannot create category', status === 400 ? 'validation' : status === 409 ? 'conflict' : 'server', status, status === 400 ? { name: 'Rejected name' } : {}));
        const user = userEvent.setup(); renderPage('/app/categories/create');
        await waitForRouteFocus();
        await user.type(screen.getByLabelText('Name'), 'Taken'); await user.selectOptions(screen.getByLabelText('Type'), 'INCOME');
        await user.click(screen.getByRole('button', { name: 'Save category' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Cannot create category');
        expect(screen.getByLabelText('Name')).toHaveValue('Taken');
        if (status === 400) expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Rejected name');
        expect(screen.getByLabelText('Type')).toHaveValue('INCOME');
    });
    it('renames a custom category without a mutable type field', async () => {
        vi.mocked(categories.getCategory).mockResolvedValueOnce(category).mockResolvedValue({ ...category, name: 'Dinner' });
        const user = userEvent.setup(); renderPage(`/app/categories/${id}/edit`);
        await waitForRouteFocus();
        await user.clear(await screen.findByLabelText('Name')); await user.type(screen.getByLabelText('Name'), 'Dinner');
        expect(screen.getByText('Type (immutable): EXPENSE')).toBeInTheDocument(); expect(screen.queryByLabelText('Type')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Save category' }));
        await screen.findByRole('heading', { name: 'Category details' }); expect(categories.updateCategory).toHaveBeenCalledWith(id, { name: 'Dinner' });
        expect(await screen.findByRole('heading', { name: 'Dinner' })).toBeInTheDocument();
    });
    it('preserves rename input after a conflict', async () => {
        vi.mocked(categories.updateCategory).mockRejectedValue(new ApiError('Category with this name and type already exists', 'conflict', 409));
        const user = userEvent.setup(); renderPage(`/app/categories/${id}/edit`);
        await waitForRouteFocus();
        await user.clear(await screen.findByLabelText('Name')); await user.type(screen.getByLabelText('Name'), 'Food');
        await user.click(screen.getByRole('button', { name: 'Save category' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('already exists'); expect(screen.getByLabelText('Name')).toHaveValue('Food');
    });
    it.each(['', '/edit'])('blocks system category mutation including direct edit links (%s)', async suffix => {
        vi.mocked(categories.getCategory).mockResolvedValue({ ...category, system: true });
        renderPage(`/app/categories/${id}${suffix}`);
        await screen.findByText(/System categories/);
        expect(screen.queryByRole('link', { name: 'Rename category' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Save category|Deactivate category/ })).not.toBeInTheDocument();
        expect(categories.updateCategory).not.toHaveBeenCalled(); expect(categories.deactivateCategory).not.toHaveBeenCalled();
    });
    it('confirms custom deactivation and returns to a refreshed active list', async () => {
        const user = userEvent.setup(); renderPage(`/app/categories/${id}`);
        await user.click(await screen.findByRole('button', { name: 'Deactivate category' }));
        expect(categories.deactivateCategory).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'Keep category active' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Deactivate category' })).toHaveFocus());
        expect(screen.queryByRole('button', { name: 'Confirm deactivation' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Deactivate category' }));
        vi.mocked(categories.getCategories).mockResolvedValue([]);
        await user.click(screen.getByRole('button', { name: 'Confirm deactivation' }));
        expect(await screen.findByRole('heading', { name: 'No expense categories' })).toBeInTheDocument();
        expect(categories.deactivateCategory).toHaveBeenCalledWith(id);
        expect(screen.getByTestId('location')).toHaveTextContent('/app/categories');
        expect(screen.getByRole('status')).toHaveTextContent('Category deactivated. Financial history is preserved.');
    });
    it('keeps category confirmation on failed deactivation', async () => {
        vi.mocked(categories.deactivateCategory).mockRejectedValue(new ApiError('Category not found', 'not-found', 404));
        const user = userEvent.setup(); renderPage(`/app/categories/${id}`);
        await user.click(await screen.findByRole('button', { name: 'Deactivate category' }));
        await user.click(screen.getByRole('button', { name: 'Confirm deactivation' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Category not found');
        expect(screen.getByRole('button', { name: 'Confirm deactivation' })).toBeEnabled();
    });
    it.each(['', '/edit'])('handles inactive/inaccessible category 404 (%s)', async suffix => {
        vi.mocked(categories.getCategory).mockRejectedValue(new ApiError('Category not found', 'not-found', 404));
        renderPage(`/app/categories/${id}${suffix}`);
        expect(await screen.findByRole('alert')).toHaveTextContent('Category not found');
        expect(screen.queryByRole('button', { name: /Save category|Deactivate category/ })).not.toBeInTheDocument();
    });
    it('discards a late list response after route navigation', async () => {
        let resolve!: (data: CategoryResponse[]) => void;
        vi.mocked(categories.getCategories).mockImplementation(() => new Promise(done => { resolve = done; }));
        renderPage('/app/categories'); expect(screen.getByRole('status')).toHaveTextContent('Loading categories');
        fireEvent.click(screen.getByRole('link', { name: 'Accounts' }));
        await screen.findByRole('link', { name: 'Savings' });
        await act(async () => resolve([category]));
        expect(screen.queryByRole('link', { name: 'Lunch' })).not.toBeInTheDocument();
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app/accounts'));
    });
});

describe('resource mutation navigation', () => {
    it.each(['account', 'category'])('does not navigate from an abandoned %s create form after a late success', async domain => {
        let complete!: () => void;
        if (domain === 'account') vi.mocked(accounts.createAccount).mockImplementation(() => new Promise(resolve => { complete = () => resolve(account); }));
        else vi.mocked(categories.createCategory).mockImplementation(() => new Promise(resolve => { complete = () => resolve(category); }));
        const user = userEvent.setup(); renderPage(`/app/${domain === 'account' ? 'accounts' : 'categories'}/create`);
        await waitForRouteFocus(); await user.type(screen.getByLabelText('Name'), 'Pending');
        await user.click(screen.getByRole('button', { name: `Save ${domain}` }));
        expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
        await user.click(screen.getByRole('link', { name: domain === 'account' ? 'Categories' : 'Accounts' }));
        await screen.findByRole('link', { name: domain === 'account' ? 'Lunch' : 'Savings' });
        await act(async () => complete());
        expect(screen.getByTestId('location')).toHaveTextContent(domain === 'account' ? '/app/categories' : '/app/accounts');
        expect(screen.queryByRole('heading', { name: /Account details|Category details/ })).not.toBeInTheDocument();
    });
});
