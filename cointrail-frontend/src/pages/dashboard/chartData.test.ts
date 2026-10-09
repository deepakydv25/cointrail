import { describe, expect, it } from 'vitest';
import { chartData, minorUnits } from './chartData';
import { formatMoney } from '../../api/financial';

describe('precision-safe relative chart geometry', () => {
    it.each(['0', '0.01', '99999999999999999.99', '199999999999999999.98', '999999999999999999999999999.99'])('keeps exact %s without a row precision cap', amount => {
        const item = { id: '9223372036854775807', label: 'Exact amount', amount };
        expect(chartData([item])[0]).toEqual({ ...item, coordinate: amount === '0' ? 0 : 1_000_000 });
        expect(minorUnits(amount)).toBe(BigInt(amount.replace('.', '').padEnd(amount.includes('.') ? amount.replace('.', '').length : amount.length + 2, '0')));
    });
    it('quantizes only geometry while tiny and huge exact amounts remain attached', () => {
        const data = chartData([{ id: '9007199254740993', label: 'Tiny', amount: '0.01' }, { id: '2', label: 'Huge', amount: '99999999999999999.99' }]);
        expect(data).toEqual([{ id: '9007199254740993', label: 'Tiny', amount: '0.01', coordinate: 0 }, { id: '2', label: 'Huge', amount: '99999999999999999.99', coordinate: 1_000_000 }]);
    });
    it('handles empty, zero, equal and uneven values with finite bounded coordinates', () => {
        expect(chartData([])).toEqual([]);
        expect(chartData(['0', '0'].map((amount, i) => ({ id: String(i), label: 'Zero', amount }))).map(item => item.coordinate)).toEqual([0, 0]);
        expect(chartData(['1', '1', '0.33'].map((amount, i) => ({ id: String(i), label: 'Amount', amount }))).map(item => item.coordinate)).toEqual([1_000_000, 1_000_000, 330_000]);
    });
    it.each(['-0.01', '1.234', '1e2', 'NaN'])('rejects unsupported chart input %s instead of rounding', value => expect(() => minorUnits(value)).toThrow());
    it('formats signed aggregates exactly without numeric currency conversion', () => {
        expect(formatMoney('-199999999999999999.98')).toBe('-₹1,99,99,99,99,99,99,99,999.98');
        expect(formatMoney('0.01')).toBe('₹0.01');
    });
});
