import { LosslessNumber, parse, stringify } from 'lossless-json';
import type { AxiosRequestConfig } from 'axios';
import { ApiError } from './errors';

// Apply only on V2 service requests, before Axios's ordinary JSON parser runs.
// All JSON numbers become strings, including nested Long IDs and future totals.
export const financialConfig: AxiosRequestConfig = {
    responseType: 'text',
    transformResponse: [(data: unknown, _headers, status) => {
        if (typeof data !== 'string' || !data.trim()) return data;
        try { return parse(data, undefined, { parseNumber: value => value }); }
        catch {
            // Non-JSON HTTP failures still reach shared status/auth normalization.
            if (status && status >= 400) return data;
            throw new ApiError('Unable to read the API response.', 'server');
        }
    }],
    transformRequest: [(data: unknown) => data === undefined ? undefined : stringify(data)],
};

export function monetaryNumber(value: string): LosslessNumber {
    // Plain signed decimal input only. Never round excess fractional digits.
    if (!/^-?(?:0|[1-9]\d{0,16})(?:\.\d{1,2})?$/.test(value)) {
        throw new ApiError('Check your opening balance.', 'validation', 400, {
            openingBalance: 'Use up to 17 integer digits and 2 decimal places, with an optional minus sign.',
        });
    }
    return new LosslessNumber(value);
}

export function longId(value: string): string {
    if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
        throw new ApiError('The requested resource was not found.', 'not-found', 404);
    }
    return value;
}

// For future V2 foreign-key payloads; route/select values stay exact strings.
export function identifierNumber(value: string): LosslessNumber {
    return new LosslessNumber(longId(value));
}

export function formatMoney(value: string): string {
    const negative = value.startsWith('-');
    const [integer, fraction = ''] = (negative ? value.slice(1) : value).split('.');
    const grouped = integer.length > 3
        ? integer.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + integer.slice(-3)
        : integer;
    return `${negative ? '-' : ''}₹${grouped}.${fraction.padEnd(2, '0')}`;
}
