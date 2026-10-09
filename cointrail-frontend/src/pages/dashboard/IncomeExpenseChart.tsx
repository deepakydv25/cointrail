import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../api/financial';
import { chartData } from './chartData';
import type { ChartAmount } from './chartData';

// Decorative geometry supplements the exact, always-visible values beside it.
export function AmountChart({ items }: { items: ChartAmount[] }) {
    const data = chartData(items);
    return <div className="ct-dashboard-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data} layout="vertical" accessibilityLayer={false} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid horizontal={false} stroke="var(--ct-border)" />
                <XAxis type="number" domain={[0, 1_000_000]} hide />
                <YAxis type="category" dataKey="label" width={72} tick={{ fill: 'var(--ct-text-secondary)', fontSize: 14 }} tickLine={false} axisLine={false} />
                <Tooltip content={({ active, payload }) => active && payload?.length ?
                    <div className="ct-dashboard-tooltip"><p>{payload[0].payload.tooltipLabel ?? payload[0].payload.label}</p><p className={`ct-amount ct-amount--${payload[0].payload.tone ?? 'neutral'}`}>{formatMoney(payload[0].payload.amount)}</p></div> : null} />
                <Bar dataKey="coordinate" fill="var(--ct-primary)" isAnimationActive={false} maxBarSize={28} />
            </BarChart>
        </ResponsiveContainer>
    </div>;
}

export default function IncomeExpenseChart({ income, expense, label }: { income: string; expense: string; label: string }) {
    return <>
        <h2>Income vs expense</h2><p className="ct-description">{label} · Relative amounts; exact values below.</p>
        <AmountChart items={[{ id: 'income', label: 'Income', amount: income, tone: 'income' }, { id: 'expense', label: 'Expense', amount: expense, tone: 'expense' }]} />
        <dl className="ct-dashboard-values" aria-label={`Income and expense for ${label}`}>
            <div><dt>Income</dt><dd className="ct-amount ct-amount--income">{formatMoney(income)}</dd></div>
            <div><dt>Expense</dt><dd className="ct-amount ct-amount--expense">{formatMoney(expense)}</dd></div>
        </dl>
    </>;
}
