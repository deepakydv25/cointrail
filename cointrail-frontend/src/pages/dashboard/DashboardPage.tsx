import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getDashboard } from '../../services/dashboardService';
import type { DashboardPeriod, DashboardResponse } from '../../types/dashboard';
import { ApiError, normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { FormField } from '../../components/ui/FormField';
import { FinancialRow } from '../../components/ui/FinancialRow';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import CategoryIcon from '../../components/CategoryIcon';
import { currentPeriod, monthRange, months, periodFromSearch, periodLabel, periodSearch, validatePeriod } from './period';
import IncomeExpenseChart from './IncomeExpenseChart';
import CategorySpending from './CategorySpending';

function PeriodForm({ initial, onApply }: { initial: DashboardPeriod; onApply: (period: DashboardPeriod) => void }) {
    const [year, setYear] = useState(initial.year); const [month, setMonth] = useState(initial.month);
    const [error, setError] = useState<ApiError | null>(null);
    return <SurfaceCard><form noValidate className="ct-dashboard-period" onSubmit={event => {
        event.preventDefault();
        try { const period = validatePeriod({ year, month }); setError(null); onApply(period); }
        catch (error) { setError(normalizeApiError(error)); }
    }}>
        <FormField id="report-month" label="Reporting month" error={error?.fieldErrors.month}>{props => <select {...props} className="ct-control" value={month} onChange={event => setMonth(event.target.value)}>
            <option value="">Choose a month</option>{months.map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}
        </select>}</FormField>
        <FormField id="report-year" label="Reporting year" error={error?.fieldErrors.year} hint="Years 1–9999">{props => <input {...props} className="ct-control" inputMode="numeric" type="number" min="1" max="9999" step="1" value={year} onChange={event => setYear(event.target.value)} />}</FormField>
        <div className="ct-actions"><Button type="submit">Apply period</Button><Button variant="secondary" onClick={() => {
            const period = currentPeriod(); setYear(period.year); setMonth(period.month); setError(null); onApply(period);
        }}>Current month</Button></div>
        {error && <p role="alert" className="ct-field-error">{error.message}</p>}
    </form><p className="ct-description">Default month follows your device calendar. Legacy expenses remain separate from V2 reports.</p></SurfaceCard>;
}

function DashboardReport({ period }: { period: DashboardPeriod }) {
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
    const transactions = (type: 'INCOME' | 'EXPENSE') => `/app/transactions?${new URLSearchParams({ type, ...range, page: '0' })}`;
    return <>
        <div className="ct-actions"><p className="ct-description">Reporting month: {label}</p><Button variant="secondary" onClick={() => { setAttempt(attempt + 1); setCategoryAttempt(categoryAttempt + 1); }}>Refresh dashboard</Button><ButtonLink variant="ghost" to={`/app/analytics?${new URLSearchParams({ ...range, grouping: 'DAILY' })}`}>View analytics</ButtonLink></div>
        <div className="ct-dashboard-grid">
            {current?.error ? <div className="ct-dashboard-wide"><ErrorState appearance="clarity" message={current.error} onRetry={() => setAttempt(attempt + 1)} /></div>
                : !data ? <div className="ct-dashboard-wide"><LoadingState appearance="clarity" message="Loading Dashboard V2…" /></div> : <>
                    <section className="ct-dashboard-metrics ct-dashboard-wide" aria-label={`Financial overview for ${label}`}>
                        <MetricCard label="Total active-account balance" value={formatMoney(data.totalActiveAccountBalance)} explanation="All recorded dates · active accounts. Opening balances plus persisted income minus expense." />
                        <MetricCard label="Monthly income" tone="income" value={formatMoney(data.monthlySummary.income)} explanation={label} />
                        <MetricCard label="Monthly expenses" tone="expense" value={formatMoney(data.monthlySummary.expense)} explanation={label} />
                        <MetricCard label="Monthly net cash flow" value={formatMoney(data.monthlySummary.netCashFlow)} explanation={`${label} · Income minus expense`} />
                    </section>
                    <SurfaceCard><section aria-label="Monthly income and expense">
                        <IncomeExpenseChart income={data.monthlySummary.income} expense={data.monthlySummary.expense} label={label} />
                        <div className="ct-actions"><ButtonLink variant="ghost" to={transactions('INCOME')}>View monthly income</ButtonLink><ButtonLink variant="ghost" to={transactions('EXPENSE')}>View monthly expenses</ButtonLink></div>
                    </section></SurfaceCard>
                </>}
            <CategorySpending {...range} label={label} attempt={categoryAttempt} onRetry={() => setCategoryAttempt(categoryAttempt + 1)} />
            {data && <>
                <SurfaceCard className="ct-dashboard-wide"><section aria-labelledby="recent-transactions-heading">
                    <h2 id="recent-transactions-heading">Recent V2 transactions</h2><p className="ct-description">Latest up to five actual transactions across all dates, including inactive history.</p>
                    {data.recentTransactions.length === 0 ? <EmptyState appearance="clarity" title="No recent V2 transactions">Create a transaction to record income or expenses.</EmptyState>
                        : <ul className="ct-financial-list">{data.recentTransactions.map(transaction => <li key={transaction.id}>
                            <FinancialRow title={transaction.description || `${transaction.type} transaction`} to={`/app/transactions/${transaction.id}`} type={transaction.type} amount={formatMoney(transaction.amount)}
                                metadata={<><p>{transaction.transactionDate}</p><p>Account: {transaction.accountName}</p></>} category={`Category: ${transaction.categoryName}`} />
                        </li>)}</ul>}
                    <ButtonLink variant="ghost" to="/app/transactions">View all transactions</ButtonLink>
                </section></SurfaceCard>
                <SurfaceCard><section aria-labelledby="budget-summary-heading">
                    <h2 id="budget-summary-heading">Budget summary</h2><p className="ct-description">{label} · Spending on budgeted expense categories only.</p>
                    {BigInt(data.budgetSummary.budgetCount) === 0n ? <EmptyState appearance="clarity" title="No budgets for this month">Monthly expenses can exist without budget definitions.</EmptyState>
                        : <dl className="ct-dashboard-values">
                            <div><dt>Budgets</dt><dd>{data.budgetSummary.budgetCount}</dd></div>
                            <div><dt>Total budget amount</dt><dd className="ct-amount">{formatMoney(data.budgetSummary.totalBudgetAmount)}</dd></div>
                            <div><dt>Spent on budgeted categories</dt><dd className="ct-amount ct-amount--expense">{formatMoney(data.budgetSummary.spentOnBudgetedCategories)}</dd></div>
                            <div><dt>Remaining budget amount</dt><dd className={`ct-amount ${data.budgetSummary.remainingBudgetAmount.startsWith('-') ? 'ct-amount--expense' : ''}`}>{formatMoney(data.budgetSummary.remainingBudgetAmount)}{data.budgetSummary.remainingBudgetAmount.startsWith('-') && ' · Over budget'}</dd></div>
                            <div><dt>Over-budget definitions</dt><dd>{data.budgetSummary.overBudgetCount}</dd></div>
                        </dl>}
                    <p className="ct-description">Aggregate remaining does not indicate whether every individual budget is within its limit.</p>
                    <ButtonLink variant="ghost" to={`/app/budgets?${periodSearch(period)}`}>View budgets</ButtonLink>
                </section></SurfaceCard>
                <SurfaceCard><section aria-labelledby="pending-recurring-heading">
                    <h2 id="pending-recurring-heading">Pending recurring transactions</h2>
                    <p className="ct-description">As of {data.pendingRecurringTransactions.asOfDate} through {data.pendingRecurringTransactions.throughDate} ({data.pendingRecurringTransactions.timezone}).</p>
                    <p className="ct-description">Up to five active or blocked next-due cursors, including overdue backlog. These are not forecasts or posting guarantees.</p>
                    {data.pendingRecurringTransactions.items.length === 0 ? <EmptyState appearance="clarity" title="No pending recurring transactions">No pending cursors in the returned window.</EmptyState>
                        : <ul className="ct-financial-list">{data.pendingRecurringTransactions.items.map(item => <li key={item.id}>
                            <div className="ct-financial-row"><CategoryIcon /><div className="ct-row-content">
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
    const { search } = useLocation(); const navigate = useNavigate();
    const [initialPeriod] = useState(currentPeriod);
    let period: DashboardPeriod | null = null; let error = '';
    try { period = periodFromSearch(search); } catch (caught) { error = normalizeApiError(caught).message; }
    useEffect(() => {
        if (!error && !period) navigate(`/app/dashboard?${periodSearch(initialPeriod)}`, { replace: true });
    }, [error, period, initialPeriod, navigate]);
    const params = new URLSearchParams(search);
    const initial = { year: params.get('year') ?? initialPeriod.year, month: params.get('month') ?? initialPeriod.month };
    return <main className="ct-page ct-dashboard">
        <PageHeader title="Dashboard V2" description="Your V2 financial overview. Legacy expenses are reported separately." actions={<><ButtonLink variant="primary" to="/app/transactions/create">Create transaction</ButtonLink><ButtonLink variant="secondary" to="/app/transactions">View transactions</ButtonLink></>} />
        <PeriodForm key={search} initial={initial} onApply={selected => navigate(`/app/dashboard?${periodSearch(selected)}`)} />
        {error ? <ErrorState appearance="clarity" message={error} /> : period ? <DashboardReport key={periodSearch(period)} period={period} /> : <LoadingState appearance="clarity" message="Selecting reporting month…" />}
    </main>;
}
