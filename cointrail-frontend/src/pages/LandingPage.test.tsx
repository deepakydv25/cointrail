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
        expect(preview.getByText('Illustrative Dashboard V2 preview · Example data, not a live account.')).toBeInTheDocument();
        for (const amount of ['₹42,500.00', '₹35,000.00', '₹12,500.00', '₹22,500.00', '₹4,500.00', '₹2,000.00', '₹6,000.00', '₹1,200.00']) expect(preview.getAllByText(amount).length).toBeGreaterThan(0);
        expect(preview.getByText('All recorded dates · active accounts')).toBeInTheDocument();
        expect(preview.getByText('Across recorded dates')).toBeInTheDocument();
        expect(preview.queryAllByRole('link')).toHaveLength(0);
        expect(preview.queryAllByRole('button')).toHaveLength(0);
        expect(document.querySelectorAll('.ct-category-icon')).toHaveLength(10);
        expect(main.getByRole('heading', { name: '1. Organize your accounts' })).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toHaveTextContent(`© ${new Date().getFullYear()} CoinTrail.`);
        expect(screen.queryByRole('link', { name: /privacy|terms/i })).not.toBeInTheDocument();
    });
    it('reacts to session changes without replacing exact illustrative data or changing the authenticated default', () => {
        const view = render(<MemoryRouter><LandingPage /></MemoryRouter>);
        auth.mockReturnValue(session(true)); view.rerender(<MemoryRouter><LandingPage /></MemoryRouter>);
        expect(screen.queryByRole('link', { name: 'Get Started' })).not.toBeInTheDocument();
        screen.getAllByRole('link', { name: 'Go to Dashboard' }).forEach(link => expect(link).toHaveAttribute('href', '/dashboard'));
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
