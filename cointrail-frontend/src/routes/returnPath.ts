/** Never redirect to an external location or back into auth routes. */
export function safeReturnPath(value: unknown): string {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/dashboard';
    const url = new URL(value, 'https://cointrail.invalid');
    const path = url.pathname;
    if (path.includes('%') || url.origin !== 'https://cointrail.invalid') return '/dashboard';
    return path === '/dashboard' || path === '/expenses' || path.startsWith('/expenses/') ||
        path === '/app' || path.startsWith('/app/') ? path + url.search + url.hash : '/dashboard';
}
