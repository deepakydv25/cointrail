import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { normalizeApiError } from '../../api/errors';
import { deleteBudget, getBudget } from '../../services/budgetService';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button, ButtonLink } from '../../components/ui/Button';
import { ConfirmationPanel } from '../../components/ui/ConfirmationPanel';
import { ErrorState, LoadingState } from '../../components/ui/States';
import CategoryIcon from '../../components/CategoryIcon';
import { monthRange, periodFromSearch, periodLabel, periodSearch } from '../dashboard/period';
import { BudgetValues } from './BudgetValues';
import type { BudgetResponse } from '../../types/budget';

function BudgetDetail({ id, search }: { id: string; search: string }) {
    const navigate = useNavigate(); const { state } = useLocation();
    const [result, setResult] = useState<{ attempt: number; data?: BudgetResponse; error?: string } | null>(null); const [attempt, setAttempt] = useState(0);
    const [confirm, setConfirm] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState('');
    const trigger = useRef<HTMLButtonElement>(null); const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        const controller = new AbortController();
        getBudget(id, controller.signal).then(data => { if (!controller.signal.aborted) setResult({ attempt, data }); }).catch(caught => {
            if (!controller.signal.aborted && !axios.isCancel(caught)) setResult({ attempt, error: normalizeApiError(caught).message });
        });
        return () => controller.abort();
    }, [id, attempt]);
    const current = result?.attempt === attempt ? result : null; const budget = current?.data;
    const context = search || (budget ? `?${periodSearch(budget)}` : '');
    const transactions = budget ? `/app/transactions?${new URLSearchParams({ type: 'EXPENSE', categoryId: budget.categoryId, ...monthRange(budget) })}` : '';
    return <main className="ct-page ct-page--narrow ct-stack"><PageHeader title="Budget details" back={<Link to={`/app/budgets${context}`}>Back to budgets</Link>} />
        {typeof state?.notice === 'string' && <p role="status">{state.notice}</p>}
        {!current ? <LoadingState appearance="clarity" message="Loading budget…" /> : current.error ? <ErrorState appearance="clarity" message={current.error} onRetry={() => setAttempt(attempt + 1)} /> : budget && <SurfaceCard className="ct-stack">
            <div className="ct-category-heading"><CategoryIcon /><h2>{budget.categoryName}</h2></div><p>{periodLabel(budget)}</p><BudgetValues budget={budget} />
            <p className="ct-description">Spending includes this category's expense transactions for the budget month. Historical category names remain available even if inactive.</p>
            <p className="ct-meta ct-description">Created: {budget.createdAt}<br />Updated: {budget.updatedAt}</p>
            {error && <ErrorState appearance="clarity" message={error} />}
            <div className="ct-actions"><ButtonLink to={`/app/budgets/${budget.id}/edit${context}`}>Edit budget amount</ButtonLink><ButtonLink variant="secondary" to={transactions}>View category expenses</ButtonLink>
                <Button variant="secondary" disabled={pending || confirm} onClick={() => setAttempt(attempt + 1)}>Refresh budget</Button>
                <Button variant="danger" ref={trigger} hidden={confirm} onClick={() => setConfirm(true)}>Delete budget</Button></div>
            {confirm && <ConfirmationPanel title="Delete this budget definition?" keepLabel="Keep budget" confirmLabel={pending ? 'Deleting…' : 'Confirm budget deletion'} pending={pending} triggerRef={trigger} onCancel={() => setConfirm(false)} onConfirm={async event => {
                event.preventDefault(); if (pending) return; setPending(true); setError('');
                try { await deleteBudget(budget.id); if (mounted.current) navigate(`/app/budgets${context}`, { state: { notice: 'Budget definition deleted. Existing transactions remain.' } }); }
                catch (caught) { if (mounted.current && !axios.isCancel(caught)) setError(normalizeApiError(caught).message); }
                finally { if (mounted.current) setPending(false); }
            }}><p>This permanently removes the monthly budget definition. Existing transactions will remain unchanged.</p></ConfirmationPanel>}
        </SurfaceCard>}
    </main>;
}
export default function BudgetDetailsPage() {
    const { id = '' } = useParams(); const { search } = useLocation();
    let context = ''; let error = '';
    try { const selected = periodFromSearch(search); context = selected ? `?${periodSearch(selected)}` : ''; }
    catch (caught) { error = normalizeApiError(caught).message; }
    return error ? <main className="ct-page"><PageHeader title="Budget details" back={<Link to="/app/budgets">Back to budgets</Link>} /><ErrorState appearance="clarity" message={error} /><Link to={`/app/budgets/${id}`}>Clear invalid period</Link></main>
        : <BudgetDetail key={`${id}${search}`} id={id} search={context} />;
}
