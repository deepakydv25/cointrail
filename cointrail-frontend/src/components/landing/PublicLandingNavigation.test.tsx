import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PublicLandingNavigation from './PublicLandingNavigation';
import { useAuth } from '../../context/useAuth';

vi.mock('../../context/useAuth', () => ({ useAuth: vi.fn() }));
function session(isAuthenticated: boolean) { return { isAuthenticated, isInitialized: true, sessionExpired: false, sessionVersion: 0, login: vi.fn(), logout: vi.fn() }; }
beforeEach(() => { vi.mocked(useAuth).mockReturnValue(session(false)); vi.stubGlobal('scrollY', 0); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('renders one inline navigation with real destinations and no disclosure or section links', () => {
    render(<MemoryRouter><PublicLandingNavigation /></MemoryRouter>);
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'CoinTrail home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'CoinTrail home' })).toHaveTextContent(/^CoinTrail$/);
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /features|how it works/i })).not.toBeInTheDocument();
});

it('reacts to session changes while preserving the dashboard default', () => {
    const view = render(<MemoryRouter><PublicLandingNavigation /></MemoryRouter>);
    vi.mocked(useAuth).mockReturnValue(session(true));
    view.rerender(<MemoryRouter><PublicLandingNavigation /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/app/dashboard');
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Get Started' })).not.toBeInTheDocument();
    vi.mocked(useAuth).mockReturnValue(session(false));
    view.rerender(<MemoryRouter><PublicLandingNavigation /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Get Started' })).toBeInTheDocument();
});

it('initializes a restored scroll position, handles threshold crossings and cleans up under StrictMode', () => {
    vi.stubGlobal('scrollY', 100);
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const view = render(<StrictMode><MemoryRouter><PublicLandingNavigation /></MemoryRouter></StrictMode>);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('ct-glass-header--scrolled');
    vi.stubGlobal('scrollY', 8); fireEvent.scroll(window);
    expect(header).not.toHaveClass('ct-glass-header--scrolled');
    vi.stubGlobal('scrollY', 9); fireEvent.scroll(window);
    expect(header).toHaveClass('ct-glass-header--scrolled');
    fireEvent.scroll(window); expect(header).toHaveClass('ct-glass-header--scrolled');
    view.unmount();
    const scrollCalls = add.mock.calls.filter(([name]) => name === 'scroll');
    expect(scrollCalls).toHaveLength(2);
    for (const [, listener, options] of scrollCalls) {
        expect(options).toEqual({ passive: true });
        expect(remove).toHaveBeenCalledWith('scroll', listener);
    }
});
