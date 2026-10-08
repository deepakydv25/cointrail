import axios from 'axios';

export type ApiErrorKind = 'validation' | 'auth' | 'forbidden' | 'not-found' | 'conflict' | 'network' | 'timeout' | 'server';

export class ApiError extends Error {
    readonly kind: ApiErrorKind;
    readonly status?: number;
    readonly fieldErrors: Record<string, string>;
    constructor(
        message: string,
        kind: ApiErrorKind,
        status?: number,
        fieldErrors: Record<string, string> = {},
    ) {
        super(message); this.name = 'ApiError';
        this.kind = kind; this.status = status; this.fieldErrors = fieldErrors;
    }
}

export function normalizeApiError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (!axios.isAxiosError(error)) return new ApiError('Unable to complete the request.', 'server');
    const status = error.response?.status;
    const kinds: Record<number, ApiErrorKind> = { 400: 'validation', 401: 'auth', 403: 'forbidden', 404: 'not-found', 409: 'conflict' };
    const kind = status ? kinds[status] ?? 'server' :
        ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '') ? 'timeout' : 'network';
    const messages: Record<ApiErrorKind, string> = {
        validation: 'Check your input and try again.', auth: 'Please log in again.',
        forbidden: 'This action is unavailable.', 'not-found': 'The requested resource was not found.',
        conflict: 'This change conflicts with the current data.', network: 'Unable to reach CoinTrail. Check your connection.',
        timeout: 'The request timed out. Please try again.', server: 'Unable to complete the request. Please try again.',
    };
    const body: unknown = error.response?.data;
    let message = messages[kind];
    const fieldErrors: Record<string, string> = {};
    if (body && typeof body === 'object') {
        if ('message' in body && typeof body.message === 'string' && status && status < 500) message = body.message;
        if ('errors' in body && body.errors && typeof body.errors === 'object') {
            for (const [key, value] of Object.entries(body.errors)) {
                if (typeof value === 'string') Object.defineProperty(fieldErrors, key, { value, enumerable: true });
            }
        }
    }
    return new ApiError(message, kind, status, fieldErrors);
}
