import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { createRecurringTransaction, getRecurringTransaction, updateRecurringTransaction, validateRecurringDates } from '../../services/recurringTransactionService';
import { transactionAmount } from '../../services/transactionService';
import { getAccounts } from '../../services/accountService';
import { getCategories } from '../../services/categoryService';
import { ApiError, normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { FormError } from '../../components/ui/FormFeedback';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import CategorySelect from '../../components/CategorySelect';
import { transactionTypes, type TransactionType } from '../../types/transaction';
import { recurrenceFrequencies, isTerminal, type RecurringTransactionResponse, type RecurrenceFrequency } from '../../types/recurringTransaction';
import type { AccountResponse } from '../../types/account';
import type { CategoryResponse } from '../../types/category';
import { recurringQuery, recurringSearch } from './query';
import { RecurringClockContext } from './RecurringClockContext';

function RuleForm({ initial, context }: { initial?: RecurringTransactionResponse; context: string }) {
    const navigate = useNavigate(); const [rule, setRule] = useState(initial); const [snapshot, setSnapshot] = useState(initial);
    const [accountId, setAccountId] = useState(initial?.accountId ?? ''); const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
    const [type, setType] = useState<TransactionType>(initial?.type ?? 'EXPENSE'); const [amount, setAmount] = useState(initial?.amount ?? '');
    const [description, setDescription] = useState<string | null>(initial?.description ?? null); const [frequency, setFrequency] = useState<RecurrenceFrequency>('MONTHLY');
    const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('');
    const [resourceAttempt, setResourceAttempt] = useState(0);
    const [resources, setResources] = useState<{ attempt: number; accounts?: AccountResponse[]; categories?: CategoryResponse[]; error?: string } | null>(null);
    const [error, setError] = useState<ApiError | null>(null); const [pending, setPending] = useState(false); const [refreshing, setRefreshing] = useState(false); const [changed, setChanged] = useState(false);
    const mounted = useRef(false); const refreshRequest = useRef<AbortController | null>(null);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; refreshRequest.current?.abort(); }; }, []);
    useEffect(() => {
        if (initial && isTerminal(initial.status)) return;
        const controller = new AbortController();
        Promise.all([getAccounts(controller.signal), getCategories(controller.signal)]).then(([accounts, categories]) => {
            if (!controller.signal.aborted) setResources({ attempt: resourceAttempt, accounts: accounts.filter(account => account.active), categories: categories.filter(category => category.active) });
        }).catch(caught => { if (!controller.signal.aborted && !axios.isCancel(caught)) setResources({ attempt: resourceAttempt, error: normalizeApiError(caught).message }); });
        return () => controller.abort();
    }, [initial, resourceAttempt]);
    const current = resources?.attempt === resourceAttempt ? resources : null;
    const accounts = current?.accounts ?? []; const categories = current?.categories ?? [];
    // Once an edit becomes BLOCKED, only the dedicated association repair is offered.
    const repair = rule?.status === 'BLOCKED'; const terminal = !!rule && isTerminal(rule.status);
    const accountEligible = accounts.some(account => account.id === accountId); const categoryEligible = categories.some(category => category.id === categoryId && category.type === type);
    const fields = ['accountId', 'categoryId', 'amount', 'description', ...(initial ? [] : ['type', 'frequency', 'startDate', 'endDate'])];
    async function refreshRule() {
        if (!rule || !snapshot || pending || refreshing) return;
        refreshRequest.current?.abort(); const controller = new AbortController(); refreshRequest.current = controller; setRefreshing(true); setError(null);
        try {
            const latest = await getRecurringTransaction(rule.id, controller.signal);
            if (!controller.signal.aborted && mounted.current) { setRule(latest); setChanged(latest.updatedAt !== snapshot.updatedAt || latest.amount !== snapshot.amount || latest.description !== snapshot.description || latest.status !== snapshot.status || latest.accountId !== snapshot.accountId || latest.categoryId !== snapshot.categoryId || latest.nextDueDate !== snapshot.nextDueDate || latest.blockedReason !== snapshot.blockedReason); }
        } catch (caught) { if (!controller.signal.aborted && mounted.current && !axios.isCancel(caught)) setError(normalizeApiError(caught)); }
        finally { if (!controller.signal.aborted && mounted.current) setRefreshing(false); }
    }
    return <main className="ct-page ct-page--narrow ct-stack"><PageHeader title={terminal ? 'Recurring rule is read-only' : repair ? 'Repair recurring rule' : initial ? 'Edit recurring rule' : 'Create recurring rule'} back={<Link to={initial ? `/app/recurring/${initial.id}${context}` : `/app/recurring${context}`}>Back to {initial ? 'rule' : 'recurring rules'}</Link>} />
        {!initial && <RecurringClockContext />}
        <SurfaceCard><form noValidate className="ct-stack" aria-busy={pending || refreshing} onSubmit={async event => {
            event.preventDefault(); if (pending || refreshing || terminal) return; setError(null);
            try {
                if (changed) throw new ApiError('The rule changed. Review the current rule before saving.', 'conflict', 409);
                if (!current || current.error || !accountEligible || !categoryEligible) throw new ApiError('Select active eligible references.', 'validation', 400, { ...(!accountEligible ? { accountId: 'Choose an active account.' } : {}), ...(!categoryEligible ? { categoryId: 'Choose an active category matching the rule type.' } : {}) });
                const financialAmount = repair ? snapshot!.amount : amount; const financialDescription = repair ? snapshot!.description : description;
                transactionAmount(financialAmount);
                if (financialDescription !== null && financialDescription.length > 500) throw new ApiError('Check your description.', 'validation', 400, { description: 'Use at most 500 characters.' });
                if (!initial) validateRecurringDates(startDate, endDate || null);
                setPending(true); const payload = { accountId, categoryId, amount: financialAmount, description: financialDescription };
                const saved = initial ? await updateRecurringTransaction(initial.id, payload) : await createRecurringTransaction({ ...payload, type, frequency, startDate, endDate: endDate || null });
                if (mounted.current) navigate(`/app/recurring/${saved.id}${context}`, { state: { notice: repair ? `Repair saved. Server returned ${saved.status}; worker recovery is asynchronous and no posting is promised.` : initial ? 'Recurring rule updated.' : 'Recurring rule created. Posting depends on the deployment scheduler.' } });
            } catch (caught) { if (mounted.current && !axios.isCancel(caught)) setError(normalizeApiError(caught)); }
            finally { if (mounted.current) setPending(false); }
        }}>
            {rule ? <><p>Status: {rule.status}</p><p>Type: {rule.type} · Frequency: {rule.frequency}</p><p>Start: {rule.startDate} · End: {rule.endDate ?? 'No end date'}</p><p>Next due: {rule.nextDueDate ?? 'No next due date'}</p>
                <p>Current account: {rule.accountName} (ID {rule.accountId})</p><p>Current category: {rule.categoryName} (ID {rule.categoryId})</p>
                <p className="ct-description">Type and schedule cannot change. Due or unprocessed occurrences can prevent financial edits; the backend decides. Refresh preserves your entered values.</p>
                {rule.blockedReason && <p>Blocked reason: {rule.blockedReason}</p>}
                {repair && <p className="ct-description">Association repair preserves the original amount and description exactly. Saving does not recover or post inline; the backend worker rechecks asynchronously and preserves backlog.</p>}
            </> : <>
                <FormField id="type" label="Type" error={error?.fieldErrors.type}>{props => <select {...props} className="ct-control" value={type} onChange={event => { setType(event.target.value as TransactionType); setCategoryId(''); }}>{transactionTypes.map(type => <option key={type}>{type}</option>)}</select>}</FormField>
                <p className="ct-description">Dates are anchored to the original start. Monthly/yearly rules clamp to the last valid day and regain the original day when possible (January 31 → February 28/29 → March 31). Frequency is interval one.</p>
            </>}
            {terminal ? <><p className="ct-description">CANCELLED and COMPLETED rules are read-only. Existing generated transactions remain unchanged.</p><p>Current amount: {formatMoney(rule!.amount)}</p><p className="whitespace-pre-wrap">Current description: {rule!.description ?? 'No description'}</p>{changed && <p className="whitespace-pre-wrap">Unsaved amount: {amount} · Unsaved description: {description ?? 'No description'}. Your input remains preserved, but this terminal rule cannot be saved.</p>}</> : <>
                {!current ? <LoadingState appearance="clarity" message="Loading eligible resources…" /> : current.error ? <ErrorState appearance="clarity" message={current.error} onRetry={() => setResourceAttempt(resourceAttempt + 1)} /> : (!accounts.length || !categories.some(category => category.type === type)) && <EmptyState appearance="clarity" title="Eligible resources required">Choose or create an active account and a matching category. <Link to="/app/accounts">View accounts</Link> · <Link to="/app/categories">View categories</Link></EmptyState>}
                {rule && (!accountEligible || !categoryEligible) && current && !current.error && <p className="ct-description">Historical references may be inactive or unavailable. Select eligible replacements; original IDs and names remain above.</p>}
                <FormField id="accountId" label="Account" error={error?.fieldErrors.accountId}>{props => <select {...props} required className="ct-control" value={accountEligible ? accountId : ''} onChange={event => setAccountId(event.target.value)}><option value="">Select an active account</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>}</FormField>
                <CategorySelect categories={categories} type={type} value={categoryEligible ? categoryId : ''} onChange={setCategoryId} error={error} />
                {repair ? <><p>Original amount: <span className={`ct-amount ct-amount--${type.toLowerCase()}`}>{formatMoney(snapshot!.amount)}</span></p><p className="whitespace-pre-wrap">Original description: {snapshot!.description ?? 'No description'}</p></> : <>
                    <FormField id="amount" label="Amount (INR)" error={error?.fieldErrors.amount} hint="Positive amount, minimum 0.01; up to 17 integer and 2 fractional digits, without rounding.">{props => <input {...props} required type="text" inputMode="decimal" className="ct-control" value={amount} onChange={event => setAmount(event.target.value)} />}</FormField>
                    <FormField id="description" label="Description (optional)" error={error?.fieldErrors.description}>{props => <textarea {...props} maxLength={500} className="ct-control" value={description ?? ''} onChange={event => setDescription(event.target.value)} />}</FormField>
                </>}
                {!initial && <>
                    <FormField id="frequency" label="Frequency" error={error?.fieldErrors.frequency}>{props => <select {...props} className="ct-control" value={frequency} onChange={event => setFrequency(event.target.value as RecurrenceFrequency)}>{recurrenceFrequencies.map(frequency => <option key={frequency}>{frequency}</option>)}</select>}</FormField>
                    <FormField id="startDate" label="Start date" error={error?.fieldErrors.startDate} hint="Today or later in the backend recurring timezone. Browser-local today is not a hard limit.">{props => <input {...props} required type="date" className="ct-control" value={startDate} onChange={event => setStartDate(event.target.value)} />}</FormField>
                    <FormField id="endDate" label="End date (optional, inclusive)" error={error?.fieldErrors.endDate}>{props => <input {...props} type="date" className="ct-control" value={endDate} onChange={event => setEndDate(event.target.value)} />}</FormField>
                </>}
                {changed && <div className="ct-stack"><p role="alert">The current rule differs from the version you opened. Your inputs are preserved; review current status and financial values before continuing.</p><p>Current amount: {formatMoney(rule!.amount)} · Current description: {rule!.description ?? 'No description'}</p>
                    <Button variant="secondary" disabled={pending || refreshing} onClick={() => { setSnapshot(rule); setChanged(false); }}>Use current version {repair ? 'for repair' : 'and keep my financial inputs'}</Button>
                </div>}
                <div className="ct-actions"><Button type="submit" pending={pending} disabled={!current || !!current.error || refreshing || changed}>{pending ? 'Saving…' : repair ? 'Save association repair' : 'Save recurring rule'}</Button>
                    <Button variant="secondary" disabled={pending || refreshing} onClick={() => setResourceAttempt(resourceAttempt + 1)}>Refresh eligible resources</Button>
                </div>
            </>}
            <FormError appearance="clarity" error={error} fields={repair || terminal ? [] : fields} />
            {error && <p className="ct-description">A failed or timed-out mutation may have completed. Review current data before another explicit submission. No mutation is retried automatically.</p>}
            {rule && <div className="ct-actions"><Button variant="secondary" disabled={pending || refreshing} onClick={refreshRule}>{refreshing ? 'Refreshing…' : 'Refresh current rule'}</Button></div>}
        </form></SurfaceCard>
    </main>;
}
function EditRule({ id, context }: { id: string; context: string }) {
    const [attempt, setAttempt] = useState(0); const [result, setResult] = useState<{ rule?: RecurringTransactionResponse; error?: string } | null>(null);
    useEffect(() => { const controller = new AbortController(); getRecurringTransaction(id, controller.signal).then(rule => { if (!controller.signal.aborted) setResult({ rule }); }).catch(caught => {
        if (!controller.signal.aborted && !axios.isCancel(caught)) setResult({ error: normalizeApiError(caught).message });
    }); return () => controller.abort(); }, [id, attempt]);
    return result?.rule ? <RuleForm initial={result.rule} context={context} /> : <main className="ct-page ct-page--narrow"><PageHeader title="Edit recurring rule" back={<Link to={`/app/recurring/${id}${context}`}>Back to rule</Link>} />
        {result?.error ? <ErrorState appearance="clarity" message={result.error} onRetry={() => { setResult(null); setAttempt(attempt + 1); }} /> : <LoadingState appearance="clarity" message="Loading recurring rule…" />}</main>;
}
export default function RecurringTransactionFormPage() {
    const { id } = useParams(); const { search } = useLocation(); let context = ''; let error = '';
    try { context = recurringSearch(recurringQuery(search)); } catch (caught) { error = normalizeApiError(caught).message; }
    return error ? <main className="ct-page"><PageHeader title={id ? 'Edit recurring rule' : 'Create recurring rule'} back={<Link to="/app/recurring">Back to recurring rules</Link>} /><ErrorState appearance="clarity" message={error} /><Link to={id ? `/app/recurring/${id}/edit` : '/app/recurring/create'}>Clear invalid filters</Link></main>
        : id ? <EditRule key={`${id}${search}`} id={id} context={context} /> : <RuleForm key={search} context={context} />;
}
