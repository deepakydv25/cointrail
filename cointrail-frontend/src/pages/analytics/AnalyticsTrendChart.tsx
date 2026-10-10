import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import { formatMoney } from '../../api/financial';
import type { TrendsResponse } from '../../types/analytics';
import { trendChartData } from './chartData';
import { ReportingDates } from './dateLabels';

export function TrendTooltip({ bucket }: { bucket: TrendsResponse['items'][number] }) {
    return <div className="ct-dashboard-tooltip"><p><ReportingDates {...bucket} /></p>
        <p className="ct-amount ct-amount--income">Income: {formatMoney(bucket.totals.income)}</p>
        <p className="ct-amount ct-amount--expense">Expense: {formatMoney(bucket.totals.expense)}</p></div>;
}
export default function AnalyticsTrendChart({ report }: { report: TrendsResponse }) {
    const [showAllDates, setShowAllDates] = useState(false);
    const data = trendChartData(report.items);
    return <>
        <p className="ct-description">{report.grouping[0] + report.grouping.slice(1).toLowerCase()} · {report.range.from} – {report.range.to}</p>
        <div className="ct-analytics-legend" aria-label="Chart legend"><span><i className="ct-analytics-legend-income" />Income</span><span><i className="ct-analytics-legend-expense" />Expenses</span></div>
        {report.totals.transactionCount === '0' && <p>No recorded transactions in this range.</p>}
        <div className="ct-dashboard-chart" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={data} accessibilityLayer={false}>
                    <CartesianGrid vertical={false} stroke="var(--ct-border)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--ct-text-secondary)', fontSize: 12 }} minTickGap={32} />
                    <YAxis domain={[0, 1_000_000]} hide />
                    <Tooltip content={({ active, payload }) => active && payload?.length ? <TrendTooltip bucket={payload[0].payload} /> : null} />
                    <Bar dataKey="incomeCoordinate" name="Income" fill="var(--ct-analytics-income)" isAnimationActive={false} maxBarSize={24} />
                    <Bar dataKey="expenseCoordinate" name="Expenses" fill="var(--ct-analytics-expense)" isAnimationActive={false} maxBarSize={24} />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <details className="ct-analytics-breakdown"><summary>View detailed breakdown</summary>
            <label className="ct-analytics-date-toggle"><input type="checkbox" checked={showAllDates} onChange={event => setShowAllDates(event.target.checked)} />Show all dates</label>
            <div className="ct-analytics-table-region" role="region" aria-label="Exact trend data" tabIndex={0}>
            <table className="ct-analytics-table"><caption>Exact {report.grouping.toLowerCase()} bucket values</caption>
                <thead><tr><th scope="col">Date / period</th><th scope="col">Income</th><th scope="col">Expense</th><th scope="col">Net cash flow</th><th scope="col">Transactions</th></tr></thead>
                <tbody>{report.items.filter(item => showAllDates || item.totals.transactionCount !== '0').map(item => <tr key={item.from}><th scope="row"><ReportingDates {...item} /></th>
                    <td className="ct-amount ct-amount--income">{formatMoney(item.totals.income)}</td><td className="ct-amount ct-amount--expense">{formatMoney(item.totals.expense)}</td>
                    <td className="ct-amount">{formatMoney(item.totals.netCashFlow)}</td><td>{item.totals.transactionCount}</td></tr>)}</tbody>
            </table>
            </div>
        </details>
    </>;
}
