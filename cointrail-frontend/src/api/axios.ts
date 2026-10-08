import axios, { CanceledError } from 'axios';
import { normalizeApiBase } from './config';
import { ApiError, normalizeApiError } from './errors';
import { expireSession, refreshSession } from './session';
import type { SessionSnapshot } from './session';

export function createApiClient(base: string | undefined) {
    const api = axios.create({
        baseURL: normalizeApiBase(base), timeout: 15_000,
        headers: { 'Content-Type': 'application/json' },
    });
    const requests = new WeakMap<object, SessionSnapshot>();
    api.interceptors.request.use(config => {
        // Bearer tokens must never reach arbitrary service URLs.
        if (!config.url || !/^\/api\//.test(config.url) || config.url.includes('\\') ||
            config.baseURL !== api.defaults.baseURL) throw new ApiError('Invalid API request path.', 'server');
        const isPublic = ['/api/v1/auth/login', '/api/v1/auth/register'].includes(config.url);
        config.headers.delete('Authorization');
        if (!isPublic) {
            const session = refreshSession();
            if (!session.token) throw new ApiError('Please log in again.', 'auth', 401);
            requests.set(config, session);
            config.headers.Authorization = `Bearer ${session.token}`;
        }
        return config;
    });
    const isStale = (config: object | undefined) => {
        const requestSession = config && requests.get(config);
        const current = refreshSession();
        return requestSession && (current.token !== requestSession.token || current.version !== requestSession.version);
    };
    api.interceptors.response.use(response => {
        if (isStale(response.config)) throw new CanceledError('Session changed.');
        return response;
    }, (error: unknown) => {
        if (axios.isCancel(error)) return Promise.reject(error);
        if (axios.isAxiosError(error)) {
            if (isStale(error.config)) return Promise.reject(new CanceledError('Session changed.'));
            const requestSession = error.config && requests.get(error.config);
            if (error.response?.status === 401 && requestSession) expireSession(requestSession);
        }
        return Promise.reject(normalizeApiError(error));
    });
    return api;
}

const api = createApiClient(import.meta.env.VITE_API_BASE_URL);
export default api;
