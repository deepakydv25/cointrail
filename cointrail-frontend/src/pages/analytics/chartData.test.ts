import { describe, expect, it } from 'vitest';
import { trendChartData } from './chartData';
const bucket = (from: string, income: string, expense: string) => ({ from, to: from, totals: { income, expense, netCashFlow: '-0.01', transactionCount: '9007199254740993' } });
describe('Analytics shared series normalization', () => {
    it('normalizes both types and every bucket against one maximum and retains exact DTOs', () => {
        const items = [bucket('2024-01-01', '99999999999999999.99', '0.01'), bucket('2024-01-02', '199999999999999999.98', '99999999999999999.99')];
        const data = trendChartData(items);
        expect(data).toEqual([{ ...items[0], label: items[0].from, incomeCoordinate: 500000, expenseCoordinate: 0 }, { ...items[1], label: items[1].from, incomeCoordinate: 1000000, expenseCoordinate: 500000 }]);
    });
    it.each(['0', '0.01', '999999999999999999999999999.99'])('handles equal%s with finite bounded geometry', amount => {
        const result = trendChartData([bucket('0001-01-01', amount, amount)])[0];
        expect(result.incomeCoordinate).toBe(amount === '0' ? 0 : 1000000); expect(result.expenseCoordinate).toBe(result.incomeCoordinate);
        expect(result.totals.income).toBe(amount);
    });
    it('preserves empty buckets, gaps and clipped bounds without generating financial values', () => {
        expect(trendChartData([])).toEqual([]);
        expect(trendChartData([{ ...bucket('2024-01-31', '0', '0'), to: '2024-02-01' }])[0]).toMatchObject({ from: '2024-01-31', to: '2024-02-01', incomeCoordinate: 0 });
    });
    it.each(['-1', '1.234', '1e2', 'NaN'])('rejects%s as nonnegative chart input', amount => expect(() => trendChartData([bucket('2024-01-01', amount, '0')])).toThrow());
});
