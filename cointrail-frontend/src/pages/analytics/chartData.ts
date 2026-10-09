import { chartData } from '../dashboard/chartData';
import type { AnalyticsBucket } from '../../types/analytics';

export function trendChartData(items: AnalyticsBucket[]) {
    const coordinates = chartData(items.flatMap(item => [
        { id: `${item.from}/income`, label: item.from, amount: item.totals.income },
        { id: `${item.from}/expense`, label: item.from, amount: item.totals.expense },
    ]));
    return items.map((item, index) => ({ ...item, label: item.from,
        incomeCoordinate: coordinates[index * 2].coordinate,
        expenseCoordinate: coordinates[index * 2 + 1].coordinate,
    }));
}
