import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../context/useAuth';
import AppShell from './AppShell';

vi.mock('../context/useAuth', () => ({ useAuth: vi.fn() }));
let resize: ((event: MediaQueryListEvent) => void) | undefined;
let matches = false;
const remove = vi.fn();
beforeEach(() => {
    matches = false; resize = undefined; remove.mockClear();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, isInitialized: true, sessionExpired: false, sessionVersion: 0, login: vi.fn(), logout: vi.fn() });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ get matches() { return matches; }, addEventListener: (_: string, listener: typeof resize) => { resize = listener; }, removeEventListener: remove })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Location() { const location = useLocation(); const navigate = useNavigate(); return <><p>{location.pathname}</p><button onClick={() => navigate(-1)}>Browser back</button></>; }
function setup() { return render(<MemoryRouter initialEntries={['/app/transactions', '/app/accounts/9223372036854775807/edit?from=2026-01-01']} initialIndex={1}><AppShell><main><h1>Edit account</h1><Location /></main></AppShell></MemoryRouter>); }
describe('Clarity application shell', () => {
    it('has one navigation tree, selected descendant and separate legacy destinations', () => {
        setup(); const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
        expect(screen.getAllByRole('navigation')).toHaveLength(1); expect(screen.getAllByRole('main')).toHaveLength(1);
        expect(within(nav).getByRole('link', { name: 'CoinTrail dashboard' })).toHaveTextContent(/^CoinTrail$/);
        expect(screen.queryByText('Spend with intention')).not.toBeInTheDocument();
        expect(within(nav).getByRole('link', { name: 'Accounts' })).toHaveAttribute('aria-current', 'page');
        expect(within(nav).getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/app/transactions');
        expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/app/dashboard');
        expect(within(nav).getByRole('link', { name: 'Expense overview' })).toHaveAttribute('href', '/dashboard');
        expect(within(nav).getByRole('link', { name: 'Expense records' })).toHaveAttribute('href', '/expenses');
        expect(within(nav).getByRole('link', { name: 'Budgets' })).toHaveAttribute('href', '/app/budgets');
        expect(within(nav).getByRole('link', { name: 'Analytics' })).toHaveAttribute('href', '/app/analytics');
        expect(within(nav).getByRole('link', { name: 'Recurring transactions' })).toHaveAttribute('href', '/app/recurring');
    });
    it('closes with Escape and returns focus, then closes on route/history changes', async () => {
        setup(); const trigger = screen.getByRole('button', { name: 'Toggle navigation menu' });
        await userEvent.click(trigger); expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await userEvent.keyboard('{Escape}'); expect(trigger).toHaveAttribute('aria-expanded', 'false'); expect(trigger).toHaveFocus();
        await userEvent.click(trigger); await userEvent.click(screen.getByRole('link', { name: 'Categories' }));
        await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
        await userEvent.click(trigger); await userEvent.click(screen.getByRole('button', { name: 'Browser back' }));
        await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    });
    it('resets mobile disclosure on breakpoint changes and cleans up the listener', async () => {
        const view = setup(); const trigger = screen.getByRole('button', { name: 'Toggle navigation menu' });
        await userEvent.click(trigger);
        act(() => { matches = true; resize?.({ matches: true } as MediaQueryListEvent); });
        expect(trigger).toHaveAttribute('aria-expanded', 'false'); expect(screen.getByRole('link', { name: 'CoinTrail dashboard' })).toHaveFocus();
        screen.getByRole('link', { name: 'Accounts' }).focus();
        act(() => { matches = false; resize?.({ matches: false } as MediaQueryListEvent); }); expect(trigger).toHaveFocus();
        view.unmount(); expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
    });
    it('logs out and returns to home', () => {
        setup(); fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
        expect(useAuth().logout).toHaveBeenCalledOnce(); expect(screen.getByText('/')).toBeInTheDocument();
    });
});
