import { useEffect, useState, type ChangeEvent } from 'react';
import axios from 'axios';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getRecurringTransactions } from '../../services/recurringTransactionService';
import { getAccounts } from '../../services/accountService';
import { getCategories } from '../../services/categoryService';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { FormField } from '../../components/ui/FormField';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Icon } from '../../components/ui/Icon';
import CategoryIcon from '../../components/CategoryIcon';
import { recurringSorts, recurringStatuses, type RecurringPage } from '../../types/recurringTransaction';
import { transactionTypes } from '../../types/transaction';
import type { AccountResponse } from '../../types/account';
import type { CategoryResponse } from '../../types/category';
import { recurringQuery, recurringSearch } from './query';

type RulePages = { key: string; pages: Record<string, RecurringPage>; error?: string; loading: boolean };

function RecurringFilters({ search, accounts, categories, onApply, onClear }: {
    search: string; accounts: AccountResponse[]; categories: CategoryResponse[]; onApply: (params: URLSearchParams) => void; onClear: () => void;
}) {
    const [filters, setFilters] = useState(() => {
        const params = new URLSearchParams(search);
        return { status: params.get('status') || '', type: params.get('type') || '', accountId: params.get('accountId') || '', categoryId: params.get('categoryId') || '', sort: params.get('sort') ?? 'createdAt,desc' };
    });
    const change = (event: ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, [event.target.name]: event.target.value });
    const sortNames = { createdAt: 'Created date', updatedAt: 'Updated date', nextDueDate: 'Next scheduled date' };
    return <SurfaceCard padding="compact" className="ct-resource-filter-panel"><div className="ct-resource-filter-heading"><h2>Filter recurring rules</h2><Button variant="ghost" onClick={onClear}>Clear all</Button></div>
        <form autoComplete="off" noValidate className="ct-filter-grid" onSubmit={event => {
            event.preventDefault(); const params = new URLSearchParams(search); params.delete('page');
            for (const key of ['status', 'type', 'accountId', 'categoryId', 'sort']) params.delete(key);
            for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
            onApply(params);
        }}>
            <FormField id="filter-status" label="Status">{props => <select {...props} name="status" className="ct-control" value={filters.status} onChange={change}><option value="">All statuses</option>{filters.status && !recurringStatuses.includes(filters.status as typeof recurringStatuses[number]) && <option>{filters.status}</option>}{recurringStatuses.map(status => <option key={status}>{status}</option>)}</select>}</FormField>
            <FormField id="filter-type" label="Type">{props => <select {...props} name="type" className="ct-control" value={filters.type} onChange={change}><option value="">All types</option>{filters.type && !transactionTypes.includes(filters.type as typeof transactionTypes[number]) && <option>{filters.type}</option>}{transactionTypes.map(type => <option key={type}>{type}</option>)}</select>}</FormField>
            <FormField id="filter-account" label="Account">{props => <select {...props} name="accountId" className="ct-control" value={filters.accountId} onChange={change}><option value="">All accounts</option>{filters.accountId && !accounts.some(account => account.id === filters.accountId) && <option value={filters.accountId}>Historical or unavailable account</option>}{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>}</FormField>
            <FormField id="filter-category" label="Category">{props => <select {...props} name="categoryId" className="ct-control" value={filters.categoryId} onChange={change}><option value="">All categories</option>{filters.categoryId && !categories.some(category => category.id === filters.categoryId) && <option value={filters.categoryId}>Historical or unavailable category</option>}{categories.map(category => <option key={category.id} value={category.id}>{category.name} ({category.type})</option>)}</select>}</FormField>
            <FormField id="filter-sort" label="Sort">{props => <select {...props} name="sort" className="ct-control" value={filters.sort} onChange={change}>{!recurringSorts.includes(filters.sort as typeof recurringSorts[number]) && <option value={filters.sort}>{filters.sort}</option>}{recurringSorts.map(sort => <option key={sort} value={sort}>{sortNames[sort.split(',')[0] as keyof typeof sortNames]} {sort.endsWith('asc') ? 'ascending' : 'descending'}</option>)}</select>}</FormField>
            <div className="ct-actions"><Button type="submit">Apply filters</Button></div>
        </form>
    </SurfaceCard>;
}

export default function RecurringTransactionsPage() {
    const { search, state } = useLocation(); const [, setParams] = useSearchParams();
    const [filtersOpen, setFiltersOpen] = useState(false); const [filterRevision, setFilterRevision] = useState(0);
    const [attempt, setAttempt] = useState(0);
    const [resources, setResources] = useState<{ attempt: number; accounts?: AccountResponse[]; categories?: CategoryResponse[]; error?: string } | null>(null);
    const [rulePages, setRulePages] = useState<RulePages | null>(null);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const reconcile = () => { clearTimeout(timer); timer = setTimeout(() => setFilterRevision(revision => revision + 1), 0); };
        window.addEventListener('popstate', reconcile);
        return () => { clearTimeout(timer); window.removeEventListener('popstate', reconcile); };
    }, []);
    let query = null; let queryError = '';
    try { query = recurringQuery(search); } catch (caught) { queryError = normalizeApiError(caught).message; }
    const baseKey = query ? recurringSearch({ ...query, page: '0' }) : '';
    const pageCount = query ? Number(query.page) + 1 : 0;

    useEffect(() => {
        const controller = new AbortController();
        Promise.all([getAccounts(controller.signal), getCategories(controller.signal)]).then(([accounts, categories]) => { if (!controller.signal.aborted) setResources({ attempt, accounts, categories }); })
            .catch(caught => { if (!controller.signal.aborted && !axios.isCancel(caught)) setResources({ attempt, error: normalizeApiError(caught).message }); });
        return () => controller.abort();
    }, [attempt]);
    useEffect(() => {
        if (!query) return;
        const controller = new AbortController();
        const previous = rulePages?.key === baseKey ? rulePages.pages : {};
        void (async () => {
            try {
                const pages = { ...previous };
                for (let page = 0; page < pageCount; page++) {
                    if (pages[String(page)]) continue;
                    const data = await getRecurringTransactions({ ...query!, page: String(page) }, controller.signal);
                    pages[String(page)] = data;
                    if (!controller.signal.aborted) setRulePages({ key: baseKey, pages: { ...pages }, loading: true });
                    if (page + 1 >= Number(data.totalPages)) break;
                }
                if (!controller.signal.aborted) setRulePages({ key: baseKey, pages, loading: false });
            } catch (caught) {
                if (!controller.signal.aborted && !axios.isCancel(caught)) setRulePages({ key: baseKey, pages: previous, error: normalizeApiError(caught).message, loading: false });
            }
        })();
        return () => controller.abort();
        // The search string identifies all supported filters and the current URL page.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, attempt]);

    const currentPages = rulePages?.key === baseKey ? rulePages.pages : {};
    const visiblePages = Object.entries(currentPages).filter(([page]) => Number(page) < pageCount).sort(([left], [right]) => Number(left) - Number(right));
    const pageData = currentPages[query?.page ?? '0'];
    const displayPage = pageData ?? visiblePages.at(-1)?.[1];
    const seenRuleIds = new Set<string>();
    const uniqueRules = visiblePages.flatMap(([, data]) => data.content).filter(rule => { if (seenRuleIds.has(rule.id)) return false; seenRuleIds.add(rule.id); return true; });
    const totalElements = displayPage?.totalElements ?? '0';
    const hasMore = displayPage !== undefined && BigInt(displayPage.number) + 1n < BigInt(displayPage.totalPages);
    const filtered = !!(query?.status || query?.type || query?.accountId || query?.categoryId);
    const currentResources = resources?.attempt === attempt ? resources : null;
    const accounts = currentResources?.accounts ?? []; const categories = currentResources?.categories ?? [];
    const setQuery = (next: URLSearchParams) => { setParams(next); setFiltersOpen(false); setFilterRevision(revision => revision + 1); };
    const clearFilters = () => setQuery(new URLSearchParams());
    const selectStatus = (status: string) => { const next = new URLSearchParams(search); if (status) next.set('status', status); else next.delete('status'); next.delete('page'); setParams(next); };
    const loadMore = () => { if (!query || !hasMore || !pageData || rulePages?.loading) return; const next = new URLSearchParams(search); next.set('page', String(BigInt(query.page) + 1n)); setParams(next); };
    const filterVisible = !!(BigInt(totalElements) > 0n || filtered || queryError || (!displayPage && !rulePages?.error));
    const activeStatuses = ['', 'ACTIVE', 'PAUSED'];
    return <main className="ct-page ct-stack">
        <PageHeader title="Recurring Transactions" description={<span className="ct-scheduler-note">Active rules need a running scheduler; status alone does not guarantee execution.</span>} actions={<ButtonLink variant="primary" to={`/app/recurring/create${query ? recurringSearch(query) : ''}`}>+ Add rule</ButtonLink>} />
        {typeof state?.notice === 'string' && <p role="status">{state.notice}</p>}
        {filterVisible && <div className="ct-resource-toolbar">
            <div className="ct-status-tabs" role="group" aria-label="Recurring rule status">{activeStatuses.map((status, index) => {
                const selected = (query?.status ?? '') === status;
                return <Button key={status || 'all'} variant={selected ? 'primary' : 'ghost'} aria-pressed={selected} onClick={() => selectStatus(status)}>{['All', 'Active', 'Paused'][index]}</Button>;
            })}</div>
            <div className="ct-resource-toolbar-actions">{filterVisible && <Button variant="ghost" className="ct-resource-filter-toggle" aria-expanded={filtersOpen} aria-controls="recurring-filters" onClick={() => setFiltersOpen(open => !open)}><Icon name="filter" /><span>Filter</span></Button>}
                <Button variant="ghost" size="icon" aria-label="Refresh rules" title="Refresh rules" onClick={() => setAttempt(value => value + 1)}><Icon name="refresh" /></Button></div>
        </div>}
        {filterVisible && <div id="recurring-filters" hidden={!filtersOpen}><RecurringFilters key={`${search}/${filterRevision}`} search={search} accounts={accounts} categories={categories} onApply={setQuery} onClear={clearFilters} /></div>}
        {!currentResources && <LoadingState appearance="clarity" message="Loading filter choices…" />}
        {currentResources?.error && filtersOpen && <ErrorState appearance="clarity" message={`Filter choices unavailable: ${currentResources.error}. Existing ID filters still work.`} onRetry={() => setAttempt(attempt + 1)} />}
        {queryError ? <><ErrorState appearance="clarity" message={queryError} /><Button variant="secondary" onClick={clearFilters}>Clear filters</Button></> : !displayPage && !rulePages?.error ? <LoadingState appearance="clarity" message="Loading recurring rules…" /> : rulePages?.error ? <ErrorState appearance="clarity" message={rulePages.error} onRetry={() => setAttempt(attempt + 1)} /> : displayPage && <>
            {uniqueRules.length === 0 ? <EmptyState appearance="clarity" title={filtered ? 'No matching recurring rules' : 'No recurring rules'}>
                {filtered ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : <><p>Add an income or expense rule to keep track of what’s scheduled.</p><ButtonLink variant="primary" to={`/app/recurring/create${query ? recurringSearch(query) : ''}`}>Add rule</ButtonLink></>}
            </EmptyState> : <SurfaceCard padding="none"><ul className="ct-resource-list ct-recurring-list">{uniqueRules.map(rule => <li key={rule.id} className="ct-resource-row">
                <CategoryIcon name={rule.categoryName} type={rule.type} size="small" />
                <div className="ct-resource-row-main"><Link className="ct-resource-row-title" to={`/app/recurring/${rule.id}${recurringSearch(query!)}`}>{rule.description || rule.categoryName}</Link>
                    <p className="ct-resource-row-meta">{rule.categoryName} <span aria-hidden="true">·</span> {rule.frequency.toLowerCase()}</p>
                    <p className="ct-resource-row-meta">{rule.nextDueDate ? `Next ${rule.nextDueDate}` : 'No next date'}{rule.blockedReason ? ` · ${rule.blockedReason.replaceAll('_', ' ').toLowerCase()}` : ''}</p>
                </div>
                <span className={`ct-resource-status ct-resource-status--${rule.status.toLowerCase()}`}>{rule.status.toLowerCase()}</span>
                <p className={`ct-amount ct-amount--${rule.type.toLowerCase()} ct-resource-row-amount`}>{formatMoney(rule.amount)}</p>
            </li>)}</ul></SurfaceCard>}
            {uniqueRules.length > 0 && <div className="ct-resource-list-footer"><p role="status">Showing {uniqueRules.length} of {totalElements} rules</p>{hasMore && <Button onClick={loadMore} pending={!pageData || !!rulePages?.loading}>Load more</Button>}</div>}
            {rulePages?.loading && pageData && <p role="status">Loading more rules…</p>}
        </>}
    </main>;
}
