import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../api/financial';
import type { TrendsResponse } from '../../types/analytics';
import { trendChartData } from './chartData';

export function TrendTooltip({ bucket }: { bucket: TrendsResponse['items'][number] }) {
    return <div className="ct-dashboard-tooltip"><p>{bucket.from} through {bucket.to}</p>
        <p className="ct-amount ct-amount--income">Income: {formatMoney(bucket.totals.income)}</p>
        <p className="ct-amount ct-amount--expense">Expense: {formatMoney(bucket.totals.expense)}</p></div>;
}
export default function AnalyticsTrendChart({ report }: { report: TrendsResponse }) {
    const pattern = useId().replaceAll(':', '');
    const data = trendChartData(report.items);
    return <>
        <p className="ct-description">{report.grouping} · {report.range.from} through {report.range.to}. Calendar weeks start Monday; edge buckets are clipped.</p>
        <p className="ct-description">Relative scale across both series. Tiny amounts may be invisible; all exact values remain in the table.</p>
        <p className="ct-description">Income: solid bars · Expense: striped bars</p>
        {report.totals.transactionCount === '0' && <p>No recorded transactions in this range.</p>}
        <div className="ct-dashboard-chart" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={data} accessibilityLayer={false}>
                    <defs><pattern id={pattern} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--ct-primary)" /><path d="M0 0L6 6" stroke="var(--ct-surface)" strokeWidth="2" /></pattern></defs>
                    <CartesianGrid vertical={false} stroke="var(--ct-border)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--ct-text-secondary)', fontSize: 12 }} minTickGap={32} />
                    <YAxis domain={[0, 1_000_000]} hide />
                    <Tooltip content={({ active, payload }) => active && payload?.length ? <TrendTooltip bucket={payload[0].payload} /> : null} />
                    <Bar dataKey="incomeCoordinate" name="Income" fill="var(--ct-primary)" isAnimationActive={false} maxBarSize={24} />
                    <Bar dataKey="expenseCoordinate" name="Expense" fill={`url(#${pattern})`} isAnimationActive={false} maxBarSize={24} />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="ct-analytics-table-region" role="region" aria-label="Exact trend data" tabIndex={0}>
            <table className="ct-analytics-table"><caption>Exact {report.grouping.toLowerCase()} bucket values</caption>
                <thead><tr><th scope="col">From / To</th><th scope="col">Income</th><th scope="col">Expense</th><th scope="col">Net cash flow</th><th scope="col">Transactions</th></tr></thead>
                <tbody>{report.items.map(item => <tr key={item.from}><th scope="row">{item.from}<br />through {item.to}</th>
                    <td className="ct-amount ct-amount--income">{formatMoney(item.totals.income)}</td><td className="ct-amount ct-amount--expense">{formatMoney(item.totals.expense)}</td>
                    <td className="ct-amount">{formatMoney(item.totals.netCashFlow)}</td><td>{item.totals.transactionCount}</td></tr>)}</tbody>
            </table>
        </div>
    </>;
}
