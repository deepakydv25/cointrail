import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError, normalizeApiError } from '../../api/errors';
import { createBudget, getBudget, updateBudget } from '../../services/budgetService';
import { transactionAmount } from '../../services/transactionService';
import { getCategories } from '../../services/categoryService';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { FormError } from '../../components/ui/FormFeedback';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import CategorySelect from '../../components/CategorySelect';
import { currentPeriod, periodFromSearch, periodLabel, periodSearch, validatePeriod } from '../dashboard/period';
import { PeriodFields } from './PeriodFields';
import type { BudgetPeriod, BudgetResponse } from '../../types/budget';
import type { CategoryResponse } from '../../types/category';

function BudgetForm({ id, period, search }: { id?: string; period: BudgetPeriod; search: string }) {
    const navigate = useNavigate(); const [value, setValue] = useState(period); const [amount, setAmount] = useState(''); const [categoryId, setCategoryId] = useState('');
    const [budget, setBudget] = useState<BudgetResponse | null>(null); const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [attempt, setAttempt] = useState(0); const [loadedAttempt, setLoadedAttempt] = useState(-1); const [loadError, setLoadError] = useState('');
    const [error, setError] = useState<ApiError | null>(null); const [pending, setPending] = useState(false); const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        const controller = new AbortController();
        if (id) getBudget(id, controller.signal).then(data => {
            if (!controller.signal.aborted) { setBudget(data); setAmount(data.amount); setLoadedAttempt(attempt); }
        }).catch(caught => { if (!controller.signal.aborted && !axios.isCancel(caught)) { setLoadError(normalizeApiError(caught).message); setLoadedAttempt(attempt); } });
        else getCategories(controller.signal).then(data => {
            if (!controller.signal.aborted) { setCategories(data.filter(category => category.active && category.type === 'EXPENSE')); setLoadedAttempt(attempt); }
        }).catch(caught => { if (!controller.signal.aborted && !axios.isCancel(caught)) { setLoadError(normalizeApiError(caught).message); setLoadedAttempt(attempt); } });
        return () => controller.abort();
    }, [id, attempt]);
    const retry = () => { setLoadError(''); setAttempt(attempt + 1); };
    const ready = loadedAttempt === attempt; const eligible = categories.some(category => category.id === categoryId);
    const context = search || (budget ? `?${periodSearch(budget)}` : `?${periodSearch(period)}`);
    return <main className="ct-page ct-page--narrow ct-stack"><PageHeader title={id ? 'Edit budget' : 'Create budget'} back={<Link to={id ? `/app/budgets/${id}${context}` : `/app/budgets${context}`}>Cancel</Link>} />
        {id && !ready ? <LoadingState appearance="clarity" message="Loading budget…" /> : id && loadError ? <ErrorState appearance="clarity" message={loadError} onRetry={retry} /> :
            <SurfaceCard><form noValidate className="ct-stack" aria-busy={pending} onSubmit={async event => {
                event.preventDefault(); if (pending) return; setError(null);
                try {
                    transactionAmount(amount);
                    if (!id) {
                        validatePeriod(value);
                        if (!ready || loadError || !eligible) throw new ApiError('Choose an active expense category.', 'validation', 400, { categoryId: 'Select an active expense category.' });
                    }
                    setPending(true);
                    const saved = id ? await updateBudget(id, { amount }) : await createBudget({ ...value, categoryId, amount });
                    if (mounted.current) navigate(`/app/budgets/${saved.id}${id && search ? search : `?${periodSearch(saved)}`}`, { state: { notice: id ? 'Budget amount updated.' : 'Budget created.' } });
                } catch (caught) { if (mounted.current && !axios.isCancel(caught)) setError(normalizeApiError(caught)); }
                finally { if (mounted.current) setPending(false); }
            }}>
                {budget ? <><p>Category: {budget.categoryName}</p><p>Period: {periodLabel(budget)}</p><p className="ct-description">Only the amount can change. Historical categories remain available even if inactive.</p></> : <>
                    <PeriodFields value={value} onChange={setValue} error={error} />
                    {!ready ? <LoadingState appearance="clarity" message="Loading expense categories…" /> : loadError ? <ErrorState appearance="clarity" message={loadError} onRetry={retry} /> : !categories.length &&
                        <EmptyState appearance="clarity" title="No active expense categories">Create an expense category before creating a budget. <Link to="/app/categories/create">Create category</Link></EmptyState>}
                    {categoryId && !eligible && ready && !loadError && <p className="ct-description">The selected category is no longer eligible. Choose an active expense category.</p>}
                    <CategorySelect categories={categories} type="EXPENSE" value={eligible ? categoryId : ''} onChange={setCategoryId} error={error} />
                    <p className="ct-description">One budget per expense category and month. System and custom expense categories are eligible.</p>
                    <Button variant="secondary" disabled={pending} onClick={retry}>Refresh categories</Button>
                </>}
                <FormField id="amount" label="Budget amount (INR)" error={error?.fieldErrors.amount} hint="Minimum 0.01. Up to 17 integer digits and 2 decimal places; no rounding.">{props =>
                    <input {...props} required className="ct-control" type="text" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />}</FormField>
                <FormError appearance="clarity" error={error} fields={id ? ['amount'] : ['year', 'month', 'categoryId', 'amount']} />
                {error && (error.kind === 'timeout' || error.kind === 'network') && <p className="ct-description">The request may have completed. Review the budget list before submitting again.</p>}
                <Button type="submit" pending={pending} disabled={id ? !budget : !ready || !!loadError || !categories.length}>{pending ? 'Saving…' : 'Save budget'}</Button>
            </form></SurfaceCard>}
    </main>;
}
export default function BudgetFormPage() {
    const { id } = useParams(); const { search } = useLocation(); const [fallback] = useState(currentPeriod);
    let selected: BudgetPeriod | null = null; let error = '';
    try { selected = periodFromSearch(search); } catch (caught) { error = normalizeApiError(caught).message; }
    return error ? <main className="ct-page"><PageHeader title={id ? 'Edit budget' : 'Create budget'} back={<Link to="/app/budgets">Back to budgets</Link>} /><ErrorState appearance="clarity" message={error} />
        <Link to={id ? `/app/budgets/${id}/edit` : '/app/budgets/create'}>Clear invalid period</Link></main>
        : <BudgetForm key={`${id ?? 'create'}${search}`} id={id} period={selected ?? fallback} search={selected ? `?${periodSearch(selected)}` : ''} />;
}
