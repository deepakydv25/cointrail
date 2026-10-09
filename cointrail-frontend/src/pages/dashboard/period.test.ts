import { describe, expect, it } from 'vitest';
import { currentPeriod, monthRange, periodFromSearch, periodLabel, periodSearch, validatePeriod } from './period';

describe('dashboard calendar periods', () => {
    it('captures the local device month explicitly and canonicalizes calendar integers', () => {
        expect(currentPeriod(new Date(2026, 9, 9))).toEqual({ year: '2026', month: '10' });
        expect(periodFromSearch('')).toBeNull();
        expect(periodFromSearch('?year=0099&month=02')).toEqual({ year: '99', month: '2' });
        expect(periodSearch({ year: '0001', month: '01' })).toBe('year=1&month=1');
        expect(periodLabel({ year: '99', month: '2' })).toBe('February 0099');
    });
    it.each([
        ['1', '1', '0001-01-01', '0001-01-31'], ['99', '2', '0099-02-01', '0099-02-28'],
        ['1900', '2', '1900-02-01', '1900-02-28'], ['2000', '2', '2000-02-01', '2000-02-29'],
        ['2024', '2', '2024-02-01', '2024-02-29'], ['2026', '12', '2026-12-01', '2026-12-31'],
        ['9999', '12', '9999-12-01', '9999-12-31'],
    ])('uses exact inclusive bounds for %s/%s', (year, month, from, to) => expect(monthRange({ year, month })).toEqual({ from, to }));
    it.each(['?year=2026', '?month=2', '?year=&month=1', '?year=0&month=1', '?year=10000&month=1', '?year=1.5&month=1', '?year=2026&month=0', '?year=2026&month=13', '?year=1&year=2&month=1', '?year=1&month=1&month=2'])('rejects invalid or ambiguous URL %s', search => {
        expect(() => periodFromSearch(search)).toThrow();
    });
    it('returns accessible year and month validation errors without substituting data', () => {
        try { validatePeriod({ year: '', month: '' }); throw new Error('Expected validation'); }
        catch (error) { expect(error).toMatchObject({ status: 400, fieldErrors: { year: expect.any(String), month: expect.any(String) } }); }
    });
});
