import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { getDashboard } from '../../services/dashboardService';
import type { DashboardPeriod, DashboardResponse } from '../../types/dashboard';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { Icon } from '../../components/ui/Icon';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { FinancialRow } from '../../components/ui/FinancialRow';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import CategoryIcon from '../../components/CategoryIcon';
import { monthRange, periodLabel, periodSearch } from './period';
import { useCurrentCalendarPeriod } from './useCurrentCalendarPeriod';
import CategorySpending from './CategorySpending';

const balanceVisibilityKey = 'cointrail.dashboard.balanceHidden';

function DashboardReport({ period, onRefresh }: { period: DashboardPeriod; onRefresh: () => DashboardPeriod }) {
    const [balanceHidden, setBalanceHidden] = useState(() => {
        try { return localStorage.getItem(balanceVisibilityKey) === 'true'; }
        catch { return false; }
    });
    const toggleBalance = () => {
        const hidden = !balanceHidden;
        setBalanceHidden(hidden);
        try { localStorage.setItem(balanceVisibilityKey, String(hidden)); }
        catch { /* Keep the toggle usable when device storage is unavailable. */ }
    };
    const [categorySettled, setCategorySettled] = useState('');
    const [refreshTarget, setRefreshTarget] = useState<{ dashboard: string; categories: string } | null>(null);
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
    const categoryKey = `${range.from}/${range.to}/${categoryAttempt}`;
    const refreshing = refreshTarget?.dashboard === key && refreshTarget.categories === categoryKey
        && (!current || categorySettled !== categoryKey);
    return <>
        <header className="ct-dashboard-header"><h1>Dashboard</h1><div className="ct-actions">
            <Button variant="ghost" size="icon" className="ct-dashboard-action" aria-label="Refresh dashboard" title="Refresh dashboard" pending={refreshing} onClick={() => {
                const next = onRefresh(); const nextRange = monthRange(next);
                setRefreshTarget({ dashboard: `${next.year}/${next.month}/${attempt + 1}`, categories: `${nextRange.from}/${nextRange.to}/${categoryAttempt + 1}` });
                setAttempt(attempt + 1); setCategoryAttempt(categoryAttempt + 1);
            }}><Icon name="refresh" className={refreshing ? 'ct-refresh-spinning' : ''} /></Button>
            <ButtonLink variant="ghost" size="icon" className="ct-dashboard-action" aria-label="View analytics" title="View analytics" to={`/app/analytics?${new URLSearchParams({ ...range, grouping: 'DAILY' })}`}><Icon name="analytics" /></ButtonLink>
        </div></header>
        <div className="ct-dashboard-grid">
            {current?.error ? <div className="ct-dashboard-wide"><ErrorState appearance="clarity" message={current.error} onRetry={() => setAttempt(attempt + 1)} /></div>
                : !data ? <div className="ct-dashboard-wide"><LoadingState appearance="clarity" message="Loading dashboard…" /></div> : <>
                    <section className="ct-dashboard-overview ct-dashboard-wide" aria-label={`Financial overview for ${label}`}>
                        <SurfaceCard className="ct-dashboard-balance">
                            <div className="ct-balance-heading"><h2>Total Balance</h2><Button variant="ghost" size="icon" className="ct-dashboard-action" aria-label={balanceHidden ? 'Show total balance' : 'Hide total balance'} title={balanceHidden ? 'Show total balance' : 'Hide total balance'} aria-controls="total-balance-amount" onClick={toggleBalance}><Icon name={balanceHidden ? 'eye-off' : 'eye'} /></Button></div>
                            <p id="total-balance-amount" className="ct-metric ct-amount" aria-live="polite">{balanceHidden ? '\u20b9 \u2022\u2022\u2022\u2022\u2022\u2022' : formatMoney(data.totalActiveAccountBalance)}</p>
                        </SurfaceCard>
                        <section aria-labelledby="monthly-cash-flow-heading"><div className="ct-cash-flow-heading"><h2 id="monthly-cash-flow-heading">Monthly Cash Flow</h2><p className="ct-description">{label}</p></div>
                            <div className="ct-dashboard-metrics">
                                <MetricCard label="Money In" tone="income" value={formatMoney(data.monthlySummary.income)} />
                                <MetricCard label="Money Out" tone="expense" value={formatMoney(data.monthlySummary.expense)} />
                                <MetricCard label="Net Cash Flow" value={formatMoney(data.monthlySummary.netCashFlow)} />
                            </div>
                        </section>
                    </section>
                </>}
            <CategorySpending {...range} label={label} attempt={categoryAttempt} onRetry={() => setCategoryAttempt(categoryAttempt + 1)} onSettled={setCategorySettled} />
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
    const calendar = useCurrentCalendarPeriod(true);
    return <main className="ct-page ct-dashboard"><DashboardReport period={calendar.period} onRefresh={calendar.recheck} /></main>;
}
