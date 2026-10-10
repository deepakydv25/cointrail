import { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { getBudgets } from '../../services/budgetService';
import { getDashboard } from '../../services/dashboardService';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { periodFromSearch, periodLabel, periodSearch } from '../dashboard/period';
import { useCurrentCalendarPeriod } from '../dashboard/useCurrentCalendarPeriod';
import { BudgetCard } from './BudgetCard';
import { BudgetProgress } from './BudgetProgress';
import type { BudgetPeriod, BudgetResponse } from '../../types/budget';
import type { DashboardResponse } from '../../types/dashboard';

function BudgetList({ period }: { period: BudgetPeriod }) {
    const { search, state } = useLocation(); const navigate = useNavigate();
    const [attempt, setAttempt] = useState(0); const [notice, setNotice] = useState('');
    const [result, setResult] = useState<{ attempt: number; data?: BudgetResponse[]; error?: string } | null>(null);
    const [overview, setOverview] = useState<{ attempt: number; data?: DashboardResponse['budgetSummary']; error?: string } | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        getBudgets(period, controller.signal).then(data => { if (!controller.signal.aborted) setResult({ attempt, data }); }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setResult({ attempt, error: normalizeApiError(error).message });
        });
        getDashboard(period, controller.signal).then(data => { if (!controller.signal.aborted) setOverview({ attempt, data: data.budgetSummary }); }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setOverview({ attempt, error: normalizeApiError(error).message });
        });
        return () => controller.abort();
    }, [period, attempt]);
    const current = result?.attempt === attempt ? result : null;
    const summary = overview?.attempt === attempt ? overview : null;
    const empty = current?.data?.length === 0;
    const context = `?${periodSearch(period)}`;
    const refreshing = !current || (!empty && !summary);
    const moveMonth = (direction: number) => {
        const index = (Number(period.year) - 1) * 12 + Number(period.month) - 1 + direction;
        const next = new URLSearchParams(search);
        next.set('year', String(Math.floor(index / 12) + 1)); next.set('month', String(index % 12 + 1));
        navigate(`/app/budgets?${next}`);
    };
    const overallOverBudget = summary?.data?.remainingBudgetAmount.startsWith('-') ?? false;
    return <>
        <PageHeader title="Budgets" actions={!empty && <ButtonLink variant="primary" to={`/app/budgets/create${context}`}>+ Add budget</ButtonLink>} />
        {(notice || typeof state?.notice === 'string') && <p role="status">{notice || state.notice}</p>}
        <div className="ct-budgets-toolbar"><nav aria-label="Budget month" className="ct-budget-month-navigation">
            <Button variant="ghost" size="icon" aria-label="Previous month" title="Previous month" disabled={period.year === '1' && period.month === '1'} onClick={() => moveMonth(-1)}><Icon name="chevron-left" /></Button>
            <h2 aria-live="polite">{periodLabel(period)}</h2>
            <Button variant="ghost" size="icon" aria-label="Next month" title="Next month" disabled={period.year === '9999' && period.month === '12'} onClick={() => moveMonth(1)}><Icon name="chevron-right" /></Button>
        </nav>{!empty && <Button variant="ghost" size="icon" className="ct-budget-icon-action" aria-label="Refresh budgets" title="Refresh budgets" pending={refreshing} onClick={() => setAttempt(value => value + 1)}><Icon name="refresh" className={refreshing ? 'ct-refresh-spinning' : ''} /></Button>}</div>
        <section aria-label={`Budgets for ${periodLabel(period)}`} aria-busy={!current} className="ct-stack">
            {!current ? <LoadingState appearance="clarity" message="Loading budgets…" /> : current.error ? <ErrorState appearance="clarity" message={current.error} onRetry={() => setAttempt(value => value + 1)} /> : empty ?
                <div className="ct-budget-empty"><EmptyState appearance="clarity" title="No budgets for this month"><p>Set spending limits for categories like Food, Shopping or Travel.</p><ButtonLink variant="primary" to={`/app/budgets/create${context}`}>+ Add your first budget</ButtonLink></EmptyState></div> : <>
                    <SurfaceCard padding="compact"><section aria-labelledby="monthly-budget-overview">
                        <h2 id="monthly-budget-overview">Monthly budget overview</h2>
                        {summary?.error ? <ErrorState appearance="clarity" message={summary.error} onRetry={() => setAttempt(value => value + 1)} /> : !summary?.data ? <LoadingState appearance="clarity" message="Loading budget overview…" /> : <>
                            <dl className="ct-budget-overview-values">
                                <div><dt>Total budget</dt><dd className="ct-amount">{formatMoney(summary.data.totalBudgetAmount)}</dd></div>
                                <div><dt>Amount spent</dt><dd className="ct-amount ct-amount--expense">{formatMoney(summary.data.spentOnBudgetedCategories)}</dd></div>
                                <div><dt>Remaining budget</dt><dd className={`ct-amount${overallOverBudget ? ' ct-amount--expense' : ''}`}>{formatMoney(summary.data.remainingBudgetAmount)}</dd></div>
                            </dl>
                            <BudgetProgress spent={summary.data.spentOnBudgetedCategories} limit={summary.data.totalBudgetAmount} label="Overall budget" overBudget={overallOverBudget} />
                        </>}
                    </section></SurfaceCard>
                    <ul className="ct-budget-list ct-budget-card-grid" aria-label="Category budgets">{current.data?.map(budget => <li key={budget.id}><BudgetCard budget={budget} search={context} onDeleted={() => {
                        setNotice('Budget definition deleted. Existing transactions remain.'); setAttempt(value => value + 1);
                    }} /></li>)}</ul>
                </>}
        </section>
    </>;
}

export default function BudgetsPage() {
    const { search } = useLocation();
    let selected: BudgetPeriod | null = null; let error = '';
    try { selected = periodFromSearch(search); } catch (caught) { error = normalizeApiError(caught).message; }
    const { period: current } = useCurrentCalendarPeriod(!selected && !error);
    const period = selected ?? current;
    return <main className="ct-page ct-budgets">{error ? <><PageHeader title="Budgets" /><ErrorState appearance="clarity" message={error} /><ButtonLink to="/app/budgets">Current month</ButtonLink></>
        : <BudgetList key={periodSearch(period)} period={period} />}</main>;
}
