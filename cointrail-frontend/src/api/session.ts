const TOKEN_KEY = 'accessToken';
export interface SessionSnapshot { token: string | null; expired: boolean; version: number }

/** A UX expiry check only: the backend verifies signatures and ownership. */
export function tokenExpiresAt(token: string): number | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
        const payload: unknown = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (!payload || typeof payload !== 'object' || !('exp' in payload) ||
            typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;
        const expiry = payload.exp * 1000;
        return Number.isFinite(expiry) && expiry > 0 ? expiry : null;
    } catch { return null; }
}

const storedToken = localStorage.getItem(TOKEN_KEY);
const storedExpiry = storedToken ? tokenExpiresAt(storedToken) : null;
let snapshot: SessionSnapshot = {
    token: storedToken && storedExpiry && storedExpiry > Date.now() ? storedToken : null,
    expired: !!storedToken && (!storedExpiry || storedExpiry <= Date.now()), version: 0,
};
if (storedToken && !snapshot.token) localStorage.removeItem(TOKEN_KEY);
const listeners = new Set<() => void>();

function publish(token: string | null, expired: boolean) {
    if (snapshot.token === token && snapshot.expired === expired) return;
    snapshot = { token, expired, version: snapshot.version + 1 };
    listeners.forEach(listener => listener());
}
export const getSessionSnapshot = () => snapshot;
export function subscribeSession(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
export function refreshSession() {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = token ? tokenExpiresAt(token) : null;
    if (token && (!expiry || expiry <= Date.now())) {
        localStorage.removeItem(TOKEN_KEY); publish(null, true);
    } else { publish(token, token ? false : snapshot.expired); }
    return snapshot;
}
export function loginSession(token: string) {
    const expiry = tokenExpiresAt(token);
    if (!expiry || expiry <= Date.now()) throw new Error('The login response did not contain a valid unexpired session.');
    localStorage.setItem(TOKEN_KEY, token); publish(token, false);
}
export function logoutSession() {
    localStorage.removeItem(TOKEN_KEY); publish(null, false);
}
export function expireSession(requestSession: SessionSnapshot) {
    refreshSession();
    if (requestSession.token && snapshot.token === requestSession.token && snapshot.version === requestSession.version) {
        localStorage.removeItem(TOKEN_KEY); publish(null, true);
    }
}
export function monitorSession() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
        clearTimeout(timer);
        const expiry = snapshot.token ? tokenExpiresAt(snapshot.token) : null;
        if (expiry) timer = setTimeout(() => { refreshSession(); schedule(); }, Math.min(Math.max(0, expiry - Date.now()), 2_147_483_647));
    };
    const sync = () => { refreshSession(); schedule(); };
    const storage = (event: StorageEvent) => {
        if (event.storageArea && event.storageArea !== localStorage) return;
        if (event.key === TOKEN_KEY || event.key === null) {
            if (!localStorage.getItem(TOKEN_KEY)) publish(null, false);
            sync();
        }
    };
    const unsubscribe = subscribeSession(schedule);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
        clearTimeout(timer); unsubscribe();
        window.removeEventListener('storage', storage);
        window.removeEventListener('focus', sync);
        document.removeEventListener('visibilitychange', sync);
    };
}
