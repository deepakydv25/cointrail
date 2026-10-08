import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import { getSessionSnapshot, loginSession, logoutSession, refreshSession, tokenExpiresAt } from '../api/session';
import { makeToken } from '../test/session';

function SessionView() {
    const auth = useAuth();
    return <>
        <p>{auth.isAuthenticated ? 'Signed in' : 'Signed out'}</p>
        {auth.sessionExpired && <p>Session expired</p>}
        <button onClick={auth.logout}>Logout</button>
    </>;
}
const renderSession = () => render(<StrictMode><AuthProvider><SessionView /></AuthProvider></StrictMode>);

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-08T12:00:00Z')); logoutSession(); });
afterEach(() => { cleanup(); logoutSession(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('JWT session lifecycle', () => {
    it('hydrates a valid persisted token and logs out explicitly', () => {
        const token = makeToken(); localStorage.setItem('accessToken', token); refreshSession();
        renderSession();
        expect(screen.getByText('Signed in')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
        expect(screen.getByText('Signed out')).toBeInTheDocument();
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(screen.queryByText('Session expired')).not.toBeInTheDocument();
    });
    it.each(['broken', makeToken(1), 'e30.e30.c2ln', 'e30.eyJleHAiOiIxMDAifQ.c2ln'])('rejects invalid/expired stored token %s', token => {
            localStorage.setItem('accessToken', token); refreshSession(); renderSession();
            expect(screen.getByText('Signed out')).toBeInTheDocument();
            expect(screen.getByText('Session expired')).toBeInTheDocument();
            expect(localStorage.getItem('accessToken')).toBeNull();
        });
    it('expires automatically at exp without a request and cleans up timers', () => {
        const setTimer = vi.spyOn(globalThis, 'setTimeout');
        const clearTimer = vi.spyOn(globalThis, 'clearTimeout');
        loginSession(makeToken(Math.floor(Date.now() / 1000) + 2));
        const view = renderSession();
        act(() => vi.advanceTimersByTime(2000));
        expect(screen.getByText('Signed out')).toBeInTheDocument();
        expect(screen.getByText('Session expired')).toBeInTheDocument();
        act(() => loginSession(makeToken()));
        const timerIndex = setTimer.mock.calls.findLastIndex(([, delay]) => delay === 3_600_000);
        expect(timerIndex).toBeGreaterThanOrEqual(0);
        const sessionTimer = setTimer.mock.results[timerIndex].value;
        view.unmount();
        expect(clearTimer).toHaveBeenCalledWith(sessionTimer);
    });
    it.each(['focus', 'visibilitychange'])('rechecks suspended tabs on %s', event => {
        loginSession(makeToken(Math.floor(Date.now() / 1000) + 2)); renderSession();
        vi.setSystemTime(Date.now() + 5000);
        act(() => { (event === 'focus' ? window : document).dispatchEvent(new Event(event)); });
        expect(screen.getByText('Signed out')).toBeInTheDocument();
        expect(localStorage.getItem('accessToken')).toBeNull();
    });
    it('synchronizes login, replacement and logout across tabs', () => {
        renderSession();
        const update = (token: string | null) => act(() => {
            if (token) localStorage.setItem('accessToken', token); else localStorage.removeItem('accessToken');
            window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }));
        });
        update(makeToken()); expect(screen.getByText('Signed in')).toBeInTheDocument();
        const version = getSessionSnapshot().version;
        update(makeToken(undefined, 'other@example.com'));
        expect(getSessionSnapshot().version).toBeGreaterThan(version);
        update(null); expect(screen.getByText('Signed out')).toBeInTheDocument();
        expect(screen.queryByText('Session expired')).not.toBeInTheDocument();
    });
    it('reacts to localStorage.clear and ignores unrelated/sessionStorage events', () => {
        loginSession(makeToken()); renderSession();
        act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken', storageArea: sessionStorage })));
        expect(screen.getByText('Signed in')).toBeInTheDocument();
        act(() => { localStorage.clear(); window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage })); });
        expect(screen.getByText('Signed out')).toBeInTheDocument();
    });
    it('rejects invalid login responses without replacing a valid session', () => {
        loginSession(makeToken()); const session = getSessionSnapshot();
        expect(() => loginSession('invalid')).toThrow();
        expect(getSessionSnapshot()).toEqual(session);
        expect(tokenExpiresAt('invalid')).toBeNull();
    });
});
