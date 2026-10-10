import { useEffect, useState, type ChangeEvent } from 'react';
import axios from 'axios';
import { useLocation, useSearchParams } from 'react-router-dom';
import { getRecurringTransactions } from '../../services/recurringTransactionService';
import { getAccounts } from '../../services/accountService';
import { getCategories } from '../../services/categoryService';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { FinancialRow } from '../../components/ui/FinancialRow';
import { FormField } from '../../components/ui/FormField';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { recurringSorts, recurringStatuses, type RecurringPage } from '../../types/recurringTransaction';
import { transactionTypes } from '../../types/transaction';
import type { AccountResponse } from '../../types/account';
import type { CategoryResponse } from '../../types/category';
import { recurringQuery, recurringSearch } from './query';

function RecurringList({ search }: { search: string }) {
    const query = recurringQuery(search); const [, setParams] = useSearchParams();
    const [attempt, setAttempt] = useState(0); const [result, setResult] = useState<{ attempt: number; data?: RecurringPage; error?: string } | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        getRecurringTransactions(recurringQuery(search), controller.signal).then(data => { if (!controller.signal.aborted) setResult({ attempt, data }); }).catch(caught => {
            if (!controller.signal.aborted && !axios.isCancel(caught)) setResult({ attempt, error: normalizeApiError(caught).message });
        });
        return () => controller.abort();
    }, [search, attempt]);
    const current = result?.attempt === attempt ? result : null; const data = current?.data;
    const filtered = !!(query.status || query.type || query.accountId || query.categoryId);
    const changePage = (page: string) => setParams(recurringSearch({ ...query, page }).slice(1));
    return <section aria-label="Recurring rules" aria-busy={!current} className="ct-stack">
        <div className="ct-actions"><Button variant="secondary" onClick={() => setAttempt(attempt + 1)}>Refresh rules</Button></div>
        {!current ? <LoadingState appearance="clarity" message="Loading recurring rules…" /> : current.error ? <ErrorState appearance="clarity" message={current.error} onRetry={() => setAttempt(attempt + 1)} /> : data && <>
            {data.content.length === 0 ? <EmptyState appearance="clarity" title={BigInt(data.number) > 0n ? 'No rules on this page' : filtered ? 'No matching recurring rules' : 'No recurring rules'}>
                {BigInt(data.number) > 0n ? 'Choose the first page to review the current results.' : filtered ? 'Clear or adjust filters to see other rules.' : 'Create a recurring income or expense rule to schedule future transactions.'}
            </EmptyState> : <SurfaceCard padding="none"><ul className="ct-financial-list">{data.content.map(rule => <li key={rule.id}>
                <FinancialRow title={rule.description || `${rule.type} recurring rule`} to={`/app/recurring/${rule.id}${recurringSearch(query)}`} type={rule.type} amount={formatMoney(rule.amount)}
                    categoryName={rule.categoryName} category={`Category: ${rule.categoryName}`} metadata={<><p>Account: {rule.accountName}</p><p>{rule.frequency} · {rule.status}</p><p>Next due: {rule.nextDueDate ?? 'No next due date'}</p>{rule.blockedReason && <p>Blocked reason: {rule.blockedReason}</p>}</>} />
            </li>)}</ul></SurfaceCard>}
            <div className="ct-pagination" aria-label="Recurring pagination"><p>{data.totalElements} rules · {BigInt(data.totalPages) === 0n ? 'No result pages' : `Page ${BigInt(data.number) + 1n} of ${data.totalPages}`}</p>
                <Button variant="secondary" disabled={BigInt(data.number) === 0n} onClick={() => changePage(String(BigInt(data.number) - 1n))}>Previous page</Button>
                <Button variant="secondary" disabled={BigInt(data.number) + 1n >= BigInt(data.totalPages)} onClick={() => changePage(String(BigInt(data.number) + 1n))}>Next page</Button>
                {BigInt(data.number) > 0n && <Button variant="secondary" onClick={() => changePage('0')}>First page</Button>}
            </div>
        </>}
    </section>;
}
function RecurringFilters({ search, accounts, categories, onApply, onClear }: {
    search: string; accounts: AccountResponse[]; categories: CategoryResponse[]; onApply: (params: URLSearchParams) => void; onClear: () => void;
}) {
    const [filters, setFilters] = useState(() => {
        const params = new URLSearchParams(search);
        return { status: params.get('status') || '', type: params.get('type') || '', accountId: params.get('accountId') || '', categoryId: params.get('categoryId') || '', size: params.get('size') ?? '20', sort: params.get('sort') ?? 'createdAt,desc' };
    });
    const change = (event: ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, [event.target.name]: event.target.value });
    const sortNames = { createdAt: 'Created date', updatedAt: 'Updated date', nextDueDate: 'Next due date' };
    return (
        <SurfaceCard><form autoComplete="off" noValidate className="ct-filter-grid" onSubmit={event => {
            event.preventDefault(); const next = new URLSearchParams();
            for (const [key, value] of Object.entries(filters)) if (value) next.set(key, value);
            next.set('page', '0'); onApply(next);
        }}>
            <FormField id="filter-status" label="Status">{props => <select {...props} name="status" className="ct-control" value={filters.status} onChange={change}><option value="">All statuses</option>
                {filters.status && !recurringStatuses.includes(filters.status as typeof recurringStatuses[number]) && <option>{filters.status}</option>}{recurringStatuses.map(status => <option key={status}>{status}</option>)}</select>}</FormField>
            <FormField id="filter-type" label="Type">{props => <select {...props} name="type" className="ct-control" value={filters.type} onChange={change}><option value="">All types</option>
                {filters.type && !transactionTypes.includes(filters.type as typeof transactionTypes[number]) && <option>{filters.type}</option>}{transactionTypes.map(type => <option key={type}>{type}</option>)}</select>}</FormField>
            <FormField id="filter-account" label="Account">{props => <select {...props} name="accountId" className="ct-control" value={filters.accountId} onChange={change}><option value="">All accounts</option>
                {filters.accountId && !accounts.some(account => account.id === filters.accountId) && <option value={filters.accountId}>Historical or unavailable account (ID {filters.accountId})</option>}
                {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>}</FormField>
            <FormField id="filter-category" label="Category">{props => <select {...props} name="categoryId" className="ct-control" value={filters.categoryId} onChange={change}><option value="">All categories</option>
                {filters.categoryId && !categories.some(category => category.id === filters.categoryId) && <option value={filters.categoryId}>Historical or unavailable category (ID {filters.categoryId})</option>}
                {categories.map(category => <option key={category.id} value={category.id}>{category.name} ({category.type})</option>)}</select>}</FormField>
            <FormField id="filter-size" label="Page size">{props => <select {...props} name="size" className="ct-control" value={filters.size} onChange={change}>
                {!['5', '10', '20', '50', '100'].includes(filters.size) && <option value={filters.size}>{filters.size || 'Invalid page size'}</option>}{['5', '10', '20', '50', '100'].map(size => <option key={size}>{size}</option>)}</select>}</FormField>
            <FormField id="filter-sort" label="Sort">{props => <select {...props} name="sort" className="ct-control" value={filters.sort} onChange={change}>
                {!recurringSorts.includes(filters.sort as typeof recurringSorts[number]) && <option value={filters.sort}>{filters.sort || 'Invalid sort'}</option>}
                {recurringSorts.map(sort => <option key={sort} value={sort}>{sortNames[sort.split(',')[0] as keyof typeof sortNames]} {sort.endsWith('asc') ? 'ascending' : 'descending'}</option>)}</select>}</FormField>
            <div className="ct-actions"><Button type="submit">Apply filters</Button><Button variant="secondary" onClick={onClear}>Clear filters</Button></div>
        </form></SurfaceCard>
    );
}
export default function RecurringTransactionsPage() {
    const { search, state } = useLocation(); const [, setParams] = useSearchParams();
    const [filterRevision, setFilterRevision] = useState(0);
    useEffect(() => {
        // Native history restoration runs after popstate and may dispatch change
        // events. Remount filters from the restored URL in the following task.
        let timer: ReturnType<typeof setTimeout>;
        const reconcile = () => { clearTimeout(timer); timer = setTimeout(() => setFilterRevision(revision => revision + 1), 0); };
        reconcile(); window.addEventListener('popstate', reconcile);
        return () => { clearTimeout(timer); window.removeEventListener('popstate', reconcile); };
    }, []);
    const [resourceAttempt, setResourceAttempt] = useState(0);
    const [resources, setResources] = useState<{ attempt: number; accounts?: AccountResponse[]; categories?: CategoryResponse[]; error?: string } | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        Promise.all([getAccounts(controller.signal), getCategories(controller.signal)]).then(([accounts, categories]) => {
            if (!controller.signal.aborted) setResources({ attempt: resourceAttempt, accounts, categories });
        }).catch(caught => { if (!controller.signal.aborted && !axios.isCancel(caught)) setResources({ attempt: resourceAttempt, error: normalizeApiError(caught).message }); });
        return () => controller.abort();
    }, [resourceAttempt]);
    let context = ''; let error = '';
    try { context = recurringSearch(recurringQuery(search)); } catch (caught) { error = normalizeApiError(caught).message; }
    const current = resources?.attempt === resourceAttempt ? resources : null;
    const accounts = current?.accounts ?? []; const categories = current?.categories ?? [];
    return <main className="ct-page ct-stack"><PageHeader title="Recurring Transactions" description="Income and expense rules. Active status does not confirm that the deployment's scheduler is running." actions={!error && <ButtonLink variant="primary" to={`/app/recurring/create${context}`}>Create recurring rule</ButtonLink>} />
        {typeof state?.notice === 'string' && <p role="status">{state.notice}</p>}
        <RecurringFilters key={`filters${search}/${filterRevision}`} search={search} accounts={accounts} categories={categories} onApply={setParams} onClear={() => setParams({})} />
        {!current ? <LoadingState appearance="clarity" message="Loading filter choices…" /> : current.error && <ErrorState appearance="clarity" message={`Filter choices unavailable: ${current.error}. Existing ID filters still work.`} onRetry={() => setResourceAttempt(resourceAttempt + 1)} />}
        {error ? <ErrorState appearance="clarity" message={error} /> : <RecurringList key={`list${search}`} search={search} />}
    </main>;
}
