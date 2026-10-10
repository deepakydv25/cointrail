import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, normalizeApiError } from '../../api/errors';
import { getBudgets } from '../../services/budgetService';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { FormError } from '../../components/ui/FormFeedback';
import CategoryIcon from '../../components/CategoryIcon';
import { currentPeriod, periodFromSearch, periodLabel, periodSearch, validatePeriod } from '../dashboard/period';
import { BudgetValues } from './BudgetValues';
import { PeriodFields } from './PeriodFields';
import type { BudgetPeriod, BudgetResponse } from '../../types/budget';

function MonthSelection({ initial }: { initial: BudgetPeriod }) {
    const [value, setValue] = useState(initial); const [error, setError] = useState<ApiError | null>(null); const navigate = useNavigate();
    return <SurfaceCard><form noValidate className="ct-stack" onSubmit={event => {
        event.preventDefault(); try { navigate(`/app/budgets?${periodSearch(validatePeriod(value))}`); setError(null); } catch (caught) { setError(normalizeApiError(caught)); }
    }}><PeriodFields value={value} onChange={setValue} error={error} /><FormError appearance="clarity" error={error} fields={['year', 'month']} /><Button type="submit">Apply month</Button></form></SurfaceCard>;
}
function BudgetList({ period }: { period: BudgetPeriod }) {
    const [attempt, setAttempt] = useState(0); const [result, setResult] = useState<{ attempt: number; data?: BudgetResponse[]; error?: string } | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        getBudgets(period, controller.signal).then(data => { if (!controller.signal.aborted) setResult({ attempt, data }); }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setResult({ attempt, error: normalizeApiError(error).message });
        });
        return () => controller.abort();
    }, [period, attempt]);
    const current = result?.attempt === attempt ? result : null; const search = `?${periodSearch(period)}`;
    return <section aria-label={`Budgets for ${periodLabel(period)}`} aria-busy={!current} className="ct-stack">
        <div className="ct-actions"><h2>{periodLabel(period)}</h2><Button variant="secondary" onClick={() => setAttempt(attempt + 1)}>Refresh budgets</Button></div>
        {!current ? <LoadingState appearance="clarity" message="Loading budgets…" /> : current.error ? <ErrorState appearance="clarity" message={current.error} onRetry={() => setAttempt(attempt + 1)} /> : !current.data?.length ?
            <EmptyState appearance="clarity" title="No budgets for this month">Create a budget for an active expense category. Expenses can exist without budget definitions.</EmptyState> :
            <ul className="ct-stack ct-budget-list">{current.data.map(budget => <li key={budget.id}><SurfaceCard className="ct-stack">
                <div className="ct-category-heading"><CategoryIcon /><Link className="ct-row-title" to={`/app/budgets/${budget.id}${search}`}>{budget.categoryName}</Link></div>
                <BudgetValues budget={budget} />
            </SurfaceCard></li>)}</ul>}
    </section>;
}
export default function BudgetsPage() {
    const { search, state } = useLocation(); const navigate = useNavigate(); const [initial] = useState(currentPeriod);
    let period: BudgetPeriod | null = null; let error = '';
    try { period = periodFromSearch(search); } catch (caught) { error = normalizeApiError(caught).message; }
    useEffect(() => { if (!period && !error) navigate(`/app/budgets?${periodSearch(initial)}`, { replace: true }); }, [period, error, initial, navigate]);
    const params = new URLSearchParams(search); const context = period ? `?${periodSearch(period)}` : '';
    return <main className="ct-page ct-stack"><PageHeader title="Budgets" description="Monthly category limits and recorded expense spending. Legacy expense records remain separate." actions={period && <>
        <ButtonLink variant="primary" to={`/app/budgets/create${context}`}>Create budget</ButtonLink><ButtonLink variant="secondary" to={`/app/dashboard${context}`}>View dashboard</ButtonLink></>} />
        {typeof state?.notice === 'string' && <p role="status">{state.notice}</p>}
        <MonthSelection key={search} initial={period ?? { year: params.get('year') ?? initial.year, month: params.get('month') ?? initial.month }} />
        {error ? <ErrorState appearance="clarity" message={error} /> : period ? <BudgetList key={periodSearch(period)} period={period} /> : <LoadingState appearance="clarity" />}
    </main>;
}
