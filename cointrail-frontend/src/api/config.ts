/** Services use explicit API paths; retain compatibility with old /api/v1 bases. */
export function normalizeApiBase(value: string | undefined): string {
    if (!value?.trim()) throw new Error('Set VITE_API_BASE_URL to the backend origin.');
    let url: URL;
    try { url = new URL(value.trim()); } catch { throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query or fragment.');
    }
    const path = url.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    return `${url.origin}${path}`;
}
