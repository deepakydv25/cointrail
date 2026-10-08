import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { ApiError, normalizeApiError } from './errors';

const httpError = (status: number, data: unknown) => new AxiosError('Untrusted transport detail', '', undefined, undefined,
    { status, data, statusText: '', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() } });

describe('API errors', () => {
    it('maps field errors and uses HTTP status instead of a mismatched body', () => {
        const error = normalizeApiError(httpError(400, { status: 500, message: 'Validation Failed', errors: { email: 'Invalid email', unknown: 'Check input', ignored: 1 } }));
        expect(error).toMatchObject({ status: 400, kind: 'validation', message: 'Validation Failed', fieldErrors: { email: 'Invalid email', unknown: 'Check input' } });
    });
    it.each([[401, 'auth'], [403, 'forbidden'], [404, 'not-found'], [409, 'conflict'], [500, 'server']])('handles status %s without JSON', (status, kind) => {
            expect(normalizeApiError(httpError(Number(status), '<html>error</html>'))).toMatchObject({ status, kind, fieldErrors: {} });
        });
    it('does not display raw server/transport details', () => {
        expect(normalizeApiError(httpError(500, { message: 'SQL or secret' })).message).not.toContain('SQL');
        expect(normalizeApiError(new Error('secret')).message).not.toContain('secret');
    });
    it('distinguishes network and timeout failures', () => {
        expect(normalizeApiError(new AxiosError('network', 'ERR_NETWORK')).kind).toBe('network');
        expect(normalizeApiError(new AxiosError('timeout', 'ECONNABORTED')).kind).toBe('timeout');
    });
    it('preserves already normalized errors', () => {
        const error = new ApiError('Duplicate name', 'conflict', 409);
        expect(normalizeApiError(error)).toBe(error);
    });
});
