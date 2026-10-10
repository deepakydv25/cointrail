import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../context/useAuth';
import AppShell from './AppShell';
import { StrictMode } from 'react';

vi.mock('../context/useAuth', () => ({ useAuth: vi.fn() }));
let resize: ((event: MediaQueryListEvent) => void) | undefined;
let matches = false;
const remove = vi.fn();
beforeEach(() => {
    matches = false; resize = undefined; remove.mockClear();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, isInitialized: true, sessionExpired: false, sessionVersion: 0, login: vi.fn(), logout: vi.fn() });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ get matches() { return matches; }, addEventListener: (_: string, listener: typeof resize) => { resize = listener; }, removeEventListener: remove })));
});
afterEach(() => { cleanup(); document.body.style.overflow = ''; document.body.style.paddingRight = ''; vi.unstubAllGlobals(); });
function Location() { const location = useLocation(); const navigate = useNavigate(); return <><p>{location.pathname}</p><button onClick={() => navigate(-1)}>Browser back</button></>; }
function setup() { return render(<MemoryRouter initialEntries={['/app/transactions', '/app/accounts/9223372036854775807/edit?from=2026-01-01']} initialIndex={1}><AppShell><main><h1>Edit account</h1><Location /></main></AppShell></MemoryRouter>); }
describe('Clarity application shell', () => {
    it('starts collapsed and preserves explicit expansion across navigation, resetting on remount', async () => {
        const view = setup();
        expect(document.querySelector('.ct-shell')).not.toHaveClass('ct-shell--navigation-expanded');
        const pin = screen.getByRole('button', { name: 'Expand navigation' });
        expect(pin).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(pin);
        expect(document.querySelector('.ct-shell')).toHaveClass('ct-shell--navigation-expanded');
        expect(screen.getByRole('button', { name: 'Collapse navigation' })).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(screen.getByRole('link', { name: 'Categories' }));
        expect(document.querySelector('.ct-shell')).toHaveClass('ct-shell--navigation-expanded');
        expect(screen.getByRole('link', { name: 'Categories' })).toHaveAttribute('aria-current', 'page');
        await userEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));
        expect(document.querySelector('.ct-shell')).not.toHaveClass('ct-shell--navigation-expanded');
        await userEvent.click(screen.getByRole('button', { name: 'Expand navigation' }));
        view.unmount(); setup();
        expect(document.querySelector('.ct-shell')).not.toHaveClass('ct-shell--navigation-expanded');
    });
    it('keeps the rail collapsed on hover and focus with named link hints', async () => {
        setup();
        const link = screen.getByRole('link', { name: 'Accounts' });
        expect(link).toHaveAttribute('title', 'Accounts');
        await userEvent.hover(link);
        act(() => link.focus());
        expect(document.querySelector('.ct-nav-hint')).toHaveTextContent('Accounts');
        expect(screen.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute('aria-expanded', 'false');
        fireEvent.blur(link);
        expect(document.querySelector('.ct-nav-hint')).not.toBeInTheDocument();
    });
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
    it('opens one modal navigation tree, focuses Close and restores body styles and trigger focus', async () => {
        document.body.style.overflow = 'auto'; document.body.style.paddingRight = '4px';
        const view = setup(); const trigger = screen.getByRole('button', { name: 'Toggle navigation menu' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await userEvent.click(trigger);
        const dialog = screen.getByRole('dialog', { name: 'Navigation' });
        expect(dialog).toHaveAttribute('open');
        expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveFocus();
        await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
        expect(screen.getByRole('button', { name: 'Logout' })).toHaveFocus();
        await userEvent.tab(); expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveFocus();
        expect(screen.getAllByRole('link', { name: 'Categories' })).toHaveLength(1);
        expect(document.querySelectorAll('#application-navigation')).toHaveLength(1);
        expect(document.body.style.overflow).toBe('hidden');
        await userEvent.click(screen.getByRole('button', { name: 'Close navigation' }));
        expect(trigger).toHaveFocus(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.body.style.overflow).toBe('auto'); expect(document.body.style.paddingRight).toBe('4px');
        await userEvent.click(trigger); view.unmount();
        expect(document.body.style.overflow).toBe('auto'); expect(document.body.style.paddingRight).toBe('4px');
        document.body.style.overflow = ''; document.body.style.paddingRight = '';
    });
    it('dismisses native cancel and backdrop clicks, and keeps drawer Logout functional', async () => {
        setup(); const trigger = screen.getByRole('button', { name: 'Toggle navigation menu' });
        await userEvent.click(trigger);
        fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
        expect(trigger).toHaveFocus(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await userEvent.click(trigger); fireEvent.click(screen.getByRole('dialog'), { clientX: -1 });
        expect(trigger).toHaveFocus(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await userEvent.click(trigger); await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
        expect(useAuth().logout).toHaveBeenCalledOnce(); expect(screen.getByText('/')).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(document.body.style.overflow).toBe('');
    });
    it('resets mobile disclosure on breakpoint changes and cleans up the listener', async () => {
        const view = setup(); const trigger = screen.getByRole('button', { name: 'Toggle navigation menu' });
        await userEvent.click(trigger);
        act(() => { matches = true; resize?.({ matches: true } as MediaQueryListEvent); });
        expect(trigger).toHaveAttribute('aria-expanded', 'false'); expect(screen.getByRole('button', { name: 'Expand navigation' })).toHaveFocus();
        screen.getByRole('link', { name: 'Accounts' }).focus();
        act(() => { matches = false; resize?.({ matches: false } as MediaQueryListEvent); }); expect(trigger).toHaveFocus();
        view.unmount(); expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
    });
    it('releases the scroll lock on history and Logout without waiting for an animation frame', async () => {
        vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
        document.body.style.overflow = 'auto'; document.body.style.paddingRight = '7px';
        setup(); const trigger = screen.getByRole('button', { name: 'Toggle navigation menu' });
        fireEvent.click(trigger); fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
        expect(document.querySelector('dialog')).toBeNull();
        expect(document.body.style.overflow).toBe('auto'); expect(document.body.style.paddingRight).toBe('7px');
        fireEvent.click(trigger); fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
        expect(document.querySelector('dialog')).toBeNull();
        expect(document.body.style.overflow).toBe('auto'); expect(document.body.style.paddingRight).toBe('7px');
        document.body.style.overflow = ''; document.body.style.paddingRight = '';
    });
    it('restores overflow and padding on every dismissal across repeated StrictMode mounts', () => {
        document.body.style.overflow = 'auto'; document.body.style.paddingRight = '5px';
        const view = render(<StrictMode><MemoryRouter><AppShell><main>Content</main></AppShell></MemoryRouter></StrictMode>);
        const trigger = screen.getByRole('button', { name: 'Toggle navigation menu' });
        const restored = () => { expect(document.body.style.overflow).toBe('auto'); expect(document.body.style.paddingRight).toBe('5px'); expect(document.querySelector('dialog')).toBeNull(); };
        for (let round = 0; round < 2; round++) {
            fireEvent.click(trigger); fireEvent.click(screen.getByRole('button', { name: 'Close navigation' })); restored();
            fireEvent.click(trigger); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); restored();
            fireEvent.click(trigger); fireEvent.click(screen.getByRole('dialog'), { clientX: -1 }); restored();
            fireEvent.click(trigger); fireEvent.click(screen.getByRole('link', { name: 'Categories' })); restored();
        }
        fireEvent.click(trigger); view.unmount(); restored();
    });
    it('logs out and returns to home', () => {
        setup(); fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
        expect(useAuth().logout).toHaveBeenCalledOnce(); expect(screen.getByText('/')).toBeInTheDocument();
    });
});
