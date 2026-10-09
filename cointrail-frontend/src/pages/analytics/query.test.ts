import { describe, expect, it } from 'vitest';
import { analyticsQuery, analyticsSearch, inclusiveDays, transactionLink, validateAnalytics, validateRange } from './query';
import type { AnalyticsGrouping } from '../../types/analytics';

describe('Analytics calendar ranges and URL state', () => {
    it.each(['0001-01-01', '0099-12-31', '2000-02-29', '9999-12-31'])('accepts same-day %s for every grouping', date => {
        for (const grouping of ['DAILY', 'WEEKLY', 'MONTHLY'] as const) expect(validateAnalytics({ from: date, to: date, grouping })).toMatchObject({ from: date, to: date });
    });
    it.each(['0000-01-01', '10000-01-01', '1900-02-29', '2100-02-29', '2024-02-30', '2024-2-01', 'bad'])('rejects malformed calendar %s', from => expect(() => validateRange({ from, to: '9999-12-31' })).toThrow());
    it('uses inclusive366 days and rejects367 without a timezone or row limit', () => {
        expect(inclusiveDays({ from: '2024-01-01', to: '2024-12-31' })).toBe(366);
        expect(validateRange({ from: '2024-01-01', to: '2024-12-31' }, 'DAILY')).toBeTruthy();
        expect(() => validateRange({ from: '2024-01-01', to: '2025-01-01' }, 'DAILY')).toThrow(/366/);
        expect(inclusiveDays({ from: '2023-01-01', to: '2024-12-31' })).toBe(731);
    });
    it.each([['2024-02-29', '2029-02-27', '2029-02-28', 'MONTHLY'], ['2024-02-29', '2026-02-27', '2026-02-28', 'WEEKLY'], ['2020-01-01', '2024-12-31', '2025-01-01', 'MONTHLY'], ['2096-02-29', '2101-02-27', '2101-02-28', 'MONTHLY']])('matches LocalDate anniversary from%s', (from, valid, invalid, grouping) => {
        expect(validateRange({ from, to: valid }, grouping as AnalyticsGrouping)).toBeTruthy();
        expect(() => validateRange({ from, to: invalid }, grouping as AnalyticsGrouping)).toThrow(/anniversary/);
    });
    it('allows validation anniversaries beyond9999 and rejects reversal', () => {
        expect(validateRange({ from: '9998-12-31', to: '9999-12-31' }, 'WEEKLY')).toBeTruthy();
        expect(() => validateRange({ from: '2024-03-01', to: '2024-02-29' })).toThrow();
    });
    it.each(['?from=2024-01-01', '?grouping=DAILY', '?from=2024-01-01&to=2024-01-31&from=2024-02-01', '?from=2024-01-01&to=2024-01-31&accountId=1', '?from=2024-01-01&to=2024-01-31&grouping=weekly', '?from=2024-01-01&to=2024-01-31&grouping=', '?from=2024-01-01&to=2024-01-31&compareFrom=2023-01-01', '?from=2024-01-01&to=2024-01-31&compareFrom=2023-01-01&compareTo=2028-01-01'])('rejects ambiguous/unsupported%s', search => expect(() => analyticsQuery(search)).toThrow());
    it('canonicalizes only missing defaults, preserving explicit grouping validation', () => {
        expect(analyticsQuery('', new Date(2024, 1, 20))).toEqual({ from: '2024-02-01', to: '2024-02-29', grouping: 'DAILY' });
        expect(analyticsQuery('?from=2023-01-01&to=2024-12-31').grouping).toBe('MONTHLY');
        expect(() => analyticsQuery('?from=2023-01-01&to=2024-12-31&grouping=DAILY')).toThrow();
    });
    it('preserves overlapping unequal explicit comparison and strips envelope metadata from drill-down', () => {
        const query = { from: '2024-01-01', to: '2024-01-31', grouping: 'DAILY' as const, compareFrom: '2024-01-15', compareTo: '2024-01-15' };
        expect(analyticsQuery(`?${analyticsSearch(query)}`)).toEqual(query);
        expect(transactionLink({ ...query, dayCount: '31' } as typeof query, { categoryId: '9223372036854775807', type: 'EXPENSE' })).toBe('/app/transactions?from=2024-01-01&to=2024-01-31&categoryId=9223372036854775807&type=EXPENSE&page=0');
    });
    it('rejects both invalid comparison bounds independently and invalid grouping in form serialization', () => {
        expect(() => analyticsSearch({ from: '2024-01-01', to: '2024-01-01', grouping: '' as AnalyticsGrouping })).toThrow();
        expect(() => validateAnalytics({ from: '2024-01-01', to: '2024-01-01', grouping: 'DAILY', compareFrom: '', compareTo: '2024-02-01' })).toThrow(/comparison/);
    });
});
