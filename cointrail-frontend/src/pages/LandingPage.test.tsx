import { StrictMode } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';
import { useAuth } from '../context/useAuth';

vi.mock('../context/useAuth', () => ({ useAuth: vi.fn() }));
const auth = vi.mocked(useAuth);
function session(isAuthenticated: boolean) { return { isAuthenticated, isInitialized: true, sessionExpired: false, sessionVersion: 0, login: vi.fn(), logout: vi.fn() }; }
beforeEach(() => { auth.mockReturnValue(session(false)); document.title = 'CoinTrail'; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('public landing', () => {
    it('renders approved structure, example financial values and real anonymous CTAs', () => {
        render(<MemoryRouter><LandingPage /></MemoryRouter>);
        const main = within(screen.getByRole('main'));
        expect(main.getByRole('heading', { level: 1 })).toHaveTextContent('Understand where your money goes.');
        const features = within(screen.getByRole('region', { name: 'The tools to understand your everyday money.' }));
        for (const name of ['Accounts', 'Transactions', 'Budgets', 'Recurring Transactions', 'Analytics']) expect(features.getByRole('heading', { name })).toBeInTheDocument();
        expect(main.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/register');
        expect(main.getByRole('link', { name: 'Create your account' })).toHaveAttribute('href', '/register');
        main.getAllByRole('link', { name: 'Sign In' }).forEach(link => expect(link).toHaveAttribute('href', '/login'));
        const preview = within(screen.getByRole('figure'));
        expect(preview.getByText('Illustrative dashboard preview · Example data, not a live account.')).toBeInTheDocument();
        expect(preview.getByText('Dashboard')).toBeInTheDocument();
        expect(preview.getByRole('heading', { name: 'Recent transactions' })).toBeInTheDocument();
        expect(screen.getByRole('main')).not.toHaveTextContent(/\bV[12]\b/);
        for (const amount of ['₹42,500.00', '₹35,000.00', '₹12,500.00', '₹22,500.00', '₹4,500.00', '₹2,000.00', '₹6,000.00', '₹1,200.00']) expect(preview.getAllByText(amount).length).toBeGreaterThan(0);
        expect(preview.getByText('All recorded dates · active accounts')).toBeInTheDocument();
        expect(preview.getByText('Across recorded dates')).toBeInTheDocument();
        expect(preview.queryAllByRole('link')).toHaveLength(0);
        expect(preview.queryAllByRole('button')).toHaveLength(0);
        const steps = within(screen.getByRole('region', { name: 'A simple way to build a clearer picture.' }));
        expect(steps.getAllByRole('listitem')).toHaveLength(3);
        expect(steps.getByRole('heading', { name: 'Organize your accounts' })).toBeInTheDocument();
        const footer = within(screen.getByRole('contentinfo'));
        expect(footer.getByRole('link', { name: 'CoinTrail home' })).toHaveTextContent(/^CoinTrail$/);
        expect(footer.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '#features');
        expect(footer.getByRole('link', { name: 'How It Works' })).toHaveAttribute('href', '#how-it-works');
        expect(footer.getByRole('heading', { name: 'Your account' })).toBeInTheDocument();
        expect(footer.getByRole('link', { name: 'Sign In' })).toHaveClass('ct-button', 'ct-button--secondary');
        expect(footer.getByRole('link', { name: 'Get Started' })).toHaveClass('ct-button', 'ct-button--primary');
        expect(screen.getByRole('contentinfo')).toHaveTextContent(`© ${new Date().getFullYear()} CoinTrail.`);
        expect(screen.queryByRole('link', { name: /privacy|terms/i })).not.toBeInTheDocument();
    });
    it('reacts to session changes without replacing exact illustrative data or changing the authenticated default', () => {
        const view = render(<MemoryRouter><LandingPage /></MemoryRouter>);
        auth.mockReturnValue(session(true)); view.rerender(<MemoryRouter><LandingPage /></MemoryRouter>);
        expect(screen.queryByRole('link', { name: 'Get Started' })).not.toBeInTheDocument();
        screen.getAllByRole('link', { name: 'Go to Dashboard' }).forEach(link => expect(link).toHaveAttribute('href', '/app/dashboard'));
        expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Go to Dashboard' })).toHaveClass('ct-button--primary');
        expect(screen.getByText('₹42,500.00')).toBeInTheDocument();
        expect(screen.getByText('Continue reviewing the financial activity you record.')).toBeInTheDocument();
        auth.mockReturnValue(session(false)); view.rerender(<MemoryRouter><LandingPage /></MemoryRouter>);
        expect(within(screen.getByRole('main')).getByRole('link', { name: 'Get Started' })).toBeInTheDocument();
    });
    it('sets and restores the landing-only title through StrictMode and remounts', () => {
        const view = render(<StrictMode><MemoryRouter><LandingPage /></MemoryRouter></StrictMode>);
        expect(document.title).toBe('CoinTrail — Understand where your money goes.');
        view.unmount(); expect(document.title).toBe('CoinTrail');
    });
});
