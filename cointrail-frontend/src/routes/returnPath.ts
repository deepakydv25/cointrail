import { AUTHENTICATED_HOME } from './destinations';

/** Never redirect to an external location or back into auth routes. */
export function safeReturnPath(value: unknown): string {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return AUTHENTICATED_HOME;
    const url = new URL(value, 'https://cointrail.invalid');
    const path = url.pathname;
    if (path.includes('%') || url.origin !== 'https://cointrail.invalid') return AUTHENTICATED_HOME;
    return path === '/dashboard' || path === '/expenses' || path.startsWith('/expenses/') ||
        path === '/app' || path.startsWith('/app/') ? path + url.search + url.hash : AUTHENTICATED_HOME;
}
