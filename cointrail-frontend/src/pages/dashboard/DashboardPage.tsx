import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getDashboard } from '../../services/dashboardService';
import type { DashboardPeriod, DashboardResponse } from '../../types/dashboard';
import { ApiError, normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import type { ReactNode } from 'react';
import { Icon } from '../../components/ui/Icon';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { FormField } from '../../components/ui/FormField';
import { FinancialRow } from '../../components/ui/FinancialRow';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import CategoryIcon from '../../components/CategoryIcon';
import { monthRange, months, periodFromSearch, periodLabel, periodSearch, validatePeriod } from './period';
import { AUTHENTICATED_HOME } from '../../routes/destinations';
import { useCurrentCalendarPeriod } from './useCurrentCalendarPeriod';
import CategorySpending from './CategorySpending';

function PeriodForm({ initial, urlError, rolling, onApply, onCurrent }: {
    initial: DashboardPeriod; urlError?: ApiError; rolling: boolean;
    onApply: (period: DashboardPeriod) => void; onCurrent: () => void;
}) {
    const form = useRef<HTMLFormElement>(null);
    const [draft, setDraft] = useState<(DashboardPeriod & { baseline: string }) | null>(null);
    const [error, setError] = useState<ApiError | null>(null);
    const initialKey = `${initial.year}/${initial.month}`;
    const { year, month } = draft ?? initial;
    const feedback = error ?? urlError;
    const change = (next: DashboardPeriod) => setDraft({ ...next, baseline: draft?.baseline ?? initialKey });
    return <form ref={form} aria-label="Reporting period" noValidate className="ct-dashboard-period" onSubmit={event => {
        event.preventDefault();
        try { const period = validatePeriod({ year, month }); setError(null); setDraft(null); onApply(period); }
        catch (error) {
            setError(normalizeApiError(error));
            requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
        }
    }}>
        <FormField id="report-month" label="Reporting month" describedBy={feedback ? 'report-period-error' : undefined} error={feedback?.fieldErrors.month}>{props => <select {...props} className="ct-control" value={month} onChange={event => change({ year, month: event.target.value })}>
            <option value="">Choose a month</option>{months.map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}
        </select>}</FormField>
        <FormField id="report-year" label="Reporting year" describedBy={feedback ? 'report-period-error' : undefined} error={feedback?.fieldErrors.year}>{props => <input {...props} className="ct-control" inputMode="numeric" type="number" min="1" max="9999" step="1" value={year} onChange={event => change({ year: event.target.value, month })} />}</FormField>
        <div className="ct-actions"><Button type="submit">Apply period</Button><Button variant="secondary" onClick={() => {
            setDraft(null); setError(null); onCurrent();
        }}>Current month</Button></div>
        {feedback && <p id="report-period-error" role="alert" className="ct-field-error">{feedback.message}</p>}
        {rolling && draft && draft.baseline !== initialKey && <p role="status">Current reporting month has changed. Your unsaved period is preserved.</p>}
    </form>;
}

function DashboardReport({ period, onRefresh, selector }: { period: DashboardPeriod; onRefresh: () => boolean; selector: ReactNode }) {
    const [attempt, setAttempt] = useState(0); const [categoryAttempt, setCategoryAttempt] = useState(0);
    const key = `${period.year}/${period.month}/${attempt}`;
    const [result, setResult] = useState<{ key: string; data?: DashboardResponse; error?: string } | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        getDashboard({ year: period.year, month: period.month }, controller.signal).then(data => {
            if (!controller.signal.aborted) setResult({ key, data });
        }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setResult({ key, error: normalizeApiError(error).message });
        });
        return () => controller.abort();
    }, [period.year, period.month, key]);
    const current = result?.key === key ? result : null;
    const data = current?.data; const label = periodLabel(period); const range = monthRange(period);
    return <>
        <header className="ct-dashboard-header"><h1>Dashboard</h1><div className="ct-dashboard-controls">{selector}<div className="ct-actions"><Button variant="secondary" size="icon" aria-label="Refresh dashboard" title="Refresh dashboard" onClick={() => {
            if (!onRefresh()) { setAttempt(attempt + 1); setCategoryAttempt(categoryAttempt + 1); }
        }}><Icon name="refresh" /></Button><ButtonLink variant="ghost" size="icon" aria-label="View analytics" title="View analytics" to={`/app/analytics?${new URLSearchParams({ ...range, grouping: 'DAILY' })}`}><Icon name="analytics" /></ButtonLink></div></div></header>
        <div className="ct-dashboard-grid">
            {current?.error ? <div className="ct-dashboard-wide"><ErrorState appearance="clarity" message={current.error} onRetry={() => setAttempt(attempt + 1)} /></div>
                : !data ? <div className="ct-dashboard-wide"><LoadingState appearance="clarity" message="Loading dashboard…" /></div> : <>
                    <section className="ct-dashboard-metrics ct-dashboard-wide" aria-label={`Financial overview for ${label}`}>
                        <MetricCard label="Total balance" value={formatMoney(data.totalActiveAccountBalance)} />
                        <MetricCard label="Monthly income" tone="income" value={formatMoney(data.monthlySummary.income)} />
                        <MetricCard label="Monthly expenses" tone="expense" value={formatMoney(data.monthlySummary.expense)} />
                        <MetricCard label="Net cash flow" value={formatMoney(data.monthlySummary.netCashFlow)} />
                    </section>
                </>}
            <CategorySpending {...range} label={label} attempt={categoryAttempt} onRetry={() => setCategoryAttempt(categoryAttempt + 1)} />
            {data && <>
                <SurfaceCard className="ct-dashboard-wide"><section aria-labelledby="recent-transactions-heading">
                    <h2 id="recent-transactions-heading">Recent transactions</h2>
                    {data.recentTransactions.length === 0 ? <EmptyState appearance="clarity" title="No recent transactions">Create a transaction to record income or expenses.</EmptyState>
                        : <ul className="ct-financial-list">{data.recentTransactions.slice(0, 5).map(transaction => <li key={transaction.id}>
                            <FinancialRow title={transaction.description || `${transaction.type} transaction`} to={`/app/transactions/${transaction.id}`} type={transaction.type} amount={formatMoney(transaction.amount)}
                                metadata={<><p>{transaction.transactionDate}</p><p>Account: {transaction.accountName}</p></>} categoryName={transaction.categoryName} category={`Category: ${transaction.categoryName}`} />
                        </li>)}</ul>}
                    <ButtonLink variant="ghost" to="/app/transactions">View all transactions</ButtonLink>
                </section></SurfaceCard>
                <SurfaceCard><section aria-labelledby="budget-summary-heading">
                    <h2 id="budget-summary-heading">Budget summary</h2><p className="ct-description">{label}</p>
                    {BigInt(data.budgetSummary.budgetCount) === 0n ? <EmptyState appearance="clarity" title="No budgets for this month">Create a budget to track your monthly spending.</EmptyState>
                        : <dl className="ct-dashboard-values">
                            <div><dt>Budgets</dt><dd>{data.budgetSummary.budgetCount}</dd></div>
                            <div><dt>Total budget amount</dt><dd className="ct-amount">{formatMoney(data.budgetSummary.totalBudgetAmount)}</dd></div>
                            <div><dt>Spent on budgeted categories</dt><dd className="ct-amount ct-amount--expense">{formatMoney(data.budgetSummary.spentOnBudgetedCategories)}</dd></div>
                            <div><dt>Remaining budget amount</dt><dd className={`ct-amount ${data.budgetSummary.remainingBudgetAmount.startsWith('-') ? 'ct-amount--expense' : ''}`}>{formatMoney(data.budgetSummary.remainingBudgetAmount)}{data.budgetSummary.remainingBudgetAmount.startsWith('-') && ' · Over budget'}</dd></div>
                            <div><dt>Over-budget definitions</dt><dd>{data.budgetSummary.overBudgetCount}</dd></div>
                        </dl>}
                    <ButtonLink variant="ghost" to={`/app/budgets?${periodSearch(period)}`}>View budgets</ButtonLink>
                </section></SurfaceCard>
                <SurfaceCard><section aria-labelledby="pending-recurring-heading">
                    <h2 id="pending-recurring-heading">Pending recurring transactions</h2>
                    <p className="ct-description">As of {data.pendingRecurringTransactions.asOfDate} through {data.pendingRecurringTransactions.throughDate} ({data.pendingRecurringTransactions.timezone}).</p>
                    {data.pendingRecurringTransactions.items.length === 0 ? <EmptyState appearance="clarity" title="No pending recurring transactions">You are all caught up for this period.</EmptyState>
                        : <ul className="ct-financial-list">{data.pendingRecurringTransactions.items.map(item => <li key={item.id}>
                            <div className="ct-financial-row"><CategoryIcon name={item.categoryName} type={item.type} /><div className="ct-row-content">
                                <p className="ct-label"><Link className="ct-row-title" to={`/app/recurring/${item.id}`}>{item.description || `${item.type} recurring transaction`}</Link></p><p className="ct-row-metadata">Account: {item.accountName} · Category: {item.categoryName}</p>
                                <p className="ct-row-metadata">Next due: {item.nextDueDate} · {item.frequency}</p>
                                <p className="ct-row-metadata">{item.status}{item.overdue && ' · Overdue'}</p>{item.blockedReason && <p className="ct-row-metadata">Blocked reason: {item.blockedReason}</p>}
                            </div><div className="ct-row-value"><span className="ct-badge">{item.type}</span><p className={`ct-amount ct-amount--${item.type.toLowerCase()}`}>{formatMoney(item.amount)}</p></div></div>
                        </li>)}</ul>}
                    <ButtonLink variant="ghost" to="/app/recurring">View recurring rules</ButtonLink>
                </section></SurfaceCard>
            </>}
        </div>
    </>;
}

export default function DashboardPage() {
    const { search, hash, key } = useLocation(); const navigate = useNavigate();
    let explicit: DashboardPeriod | null = null; let error: ApiError | undefined;
    try { explicit = periodFromSearch(search); } catch (caught) { error = normalizeApiError(caught); }
    const rolling = !error && !explicit;
    const calendar = useCurrentCalendarPeriod(rolling);
    const period = explicit ?? calendar.period;
    const params = new URLSearchParams(search);
    const initial = explicit ?? { year: params.get('year') ?? calendar.period.year, month: params.get('month') ?? calendar.period.month };
    const select = (selected?: DashboardPeriod) => {
        const next = new URLSearchParams(search);
        next.delete('year'); next.delete('month');
        if (selected) { next.set('year', selected.year); next.set('month', selected.month); }
        const nextSearch = next.size ? `?${next}` : '';
        if (nextSearch !== search) navigate({ pathname: AUTHENTICATED_HOME, search: nextSearch, hash });
    };
    const selector = <PeriodForm key={key} initial={initial} urlError={error} rolling={rolling} onApply={select} onCurrent={() => { calendar.recheck(); select(); }} />;
    return <main className="ct-page ct-dashboard">
        {error ? <header className="ct-dashboard-header"><h1>Dashboard</h1>{selector}</header> : <DashboardReport period={period} selector={selector} onRefresh={() => {
            if (!rolling) return false;
            return periodSearch(calendar.recheck()) !== periodSearch(period);
        }} />}
    </main>;
}
