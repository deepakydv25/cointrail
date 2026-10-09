import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PublicLandingNavigation from './PublicLandingNavigation';
import { useAuth } from '../../context/useAuth';

vi.mock('../../context/useAuth', () => ({ useAuth: vi.fn() }));
beforeEach(() => { vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, isInitialized: true, sessionExpired: false, sessionVersion: 0, login: vi.fn(), logout: vi.fn() }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function History() { const navigate = useNavigate(); return <><button onClick={() => navigate('/#features')}>Navigate section</button><button onClick={() => navigate(-1)}>Back</button></>; }
it('exposes real destinations and closes the disclosure on Escape with focus return and link selection', () => {
    render(<MemoryRouter><PublicLandingNavigation /></MemoryRouter>);
    const toggle = screen.getByRole('button', { name: 'Toggle navigation menu' });
    expect(toggle).toHaveAttribute('aria-controls', 'landing-navigation');
    fireEvent.click(toggle); expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const features = screen.getByRole('link', { name: 'Features' });
    features.focus(); fireEvent.keyDown(features, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false'); expect(toggle).toHaveFocus();
    fireEvent.click(toggle); fireEvent.click(features); expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(features).toHaveAttribute('href', '#features');
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '#how-it-works');
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/register');
});
it('closes on route/history changes without changing section destinations', async () => {
    render(<MemoryRouter><PublicLandingNavigation /><History /></MemoryRouter>);
    const toggle = screen.getByRole('button', { name: 'Toggle navigation menu' });
    await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
    fireEvent.click(toggle); fireEvent.click(screen.getByRole('button', { name: 'Navigate section' }));
    await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle); fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
it('returns focus from hidden controls across breakpoints and cleans up listeners', () => {
    let changed = () => {}; const remove = vi.fn();
    const media = { matches: false, addEventListener: vi.fn((_name, callback) => { changed = callback; }), removeEventListener: remove };
    vi.stubGlobal('matchMedia', vi.fn(() => media));
    const view = render(<MemoryRouter><PublicLandingNavigation /></MemoryRouter>);
    const toggle = screen.getByRole('button', { name: 'Toggle navigation menu' });
    toggle.focus(); media.matches = true; act(changed);
    expect(screen.getByRole('link', { name: 'CoinTrail home' })).toHaveFocus();
    screen.getByRole('link', { name: 'Features' }).focus(); media.matches = false; act(changed);
    expect(toggle).toHaveFocus(); expect(toggle).toHaveAttribute('aria-expanded', 'false');
    view.unmount(); expect(remove).toHaveBeenCalledWith('change', changed);
});
