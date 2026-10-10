import { Icon } from '../../components/ui/Icon';
import { FormField } from '../../components/ui/FormField';
import { FinancialRow } from '../../components/ui/FinancialRow';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button, ButtonLink } from '../../components/ui/Button';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useSearchParams } from 'react-router-dom';
import { getTransactions } from '../../services/transactionService';
import { getAccounts } from '../../services/accountService';
import { getCategories } from '../../services/categoryService';
import type { AccountResponse } from '../../types/account';
import type { CategoryResponse } from '../../types/category';
import { transactionSorts, transactionTypes } from '../../types/transaction';
import type { TransactionPage, TransactionResponse } from '../../types/transaction';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { transactionQuery } from './query';

const filterKeys = ['type', 'accountId', 'categoryId', 'from', 'to', 'size', 'sort'] as const;
const sortNames = { transactionDate: 'Transaction date', amount: 'Amount', createdAt: 'Created date', updatedAt: 'Updated date' };

function dateHeading(date: string) {
    const now = new Date(); const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    if (date === localDate(now)) return 'Today';
    if (date === localDate(yesterday)) return 'Yesterday';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

export default function TransactionsPage() {
    const { search, state } = useLocation();
    const [params, setParams] = useSearchParams();
    const [page, setPage] = useState<{ search: string; data: TransactionPage } | null>(null);
    const [error, setError] = useState<{ search: string; message: string } | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [resourceError, setResourceError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        Promise.all([getAccounts(controller.signal), getCategories(controller.signal)]).then(([accounts, categories]) => {
            if (!controller.signal.aborted) { setAccounts(accounts); setCategories(categories); }
        }).catch(error => { if (!controller.signal.aborted && !axios.isCancel(error)) setResourceError(normalizeApiError(error).message); });
        return () => controller.abort();
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                const data = await getTransactions(transactionQuery(search), controller.signal);
                if (!controller.signal.aborted) { setPage({ search, data }); setError(null); }
            } catch (error) { if (!controller.signal.aborted && !axios.isCancel(error)) setError({ search, message: normalizeApiError(error).message }); }
        })();
        return () => controller.abort();
    }, [search, attempt]);
    const data = page?.search === search ? page.data : null;
    const currentError = error?.search === search ? error.message : '';
    const inputClass = 'ct-control';
    const sort = params.get('sort') || 'transactionDate,desc';
    const hasConstraints = ['type', 'accountId', 'categoryId', 'from', 'to'].some(key => params.get(key));
    const firstUse = data?.totalElements === '0' && !hasConstraints && !currentError;
    const activeFilters = filterKeys.flatMap(key => {
        const value = params.get(key);
        if (!value || (key === 'sort' && value === 'transactionDate,desc') || (key === 'size' && value === '20')) return [];
        const labels = { type: 'Type', accountId: 'Account', categoryId: 'Category', from: 'From', to: 'To', size: 'Page size', sort: 'Sort' };
        const name = key === 'accountId' ? accounts.find(account => account.id === value)?.name ?? `ID ${value}`
            : key === 'categoryId' ? categories.find(category => category.id === value)?.name ?? `ID ${value}`
                : key === 'sort' ? `${sortNames[value.split(',')[0] as keyof typeof sortNames] ?? value} ${value.endsWith('asc') ? 'ascending' : 'descending'}` : value;
        return [`${labels[key]}: ${name}`];
    });
    const clearFilters = () => {
        const next = new URLSearchParams(params);
        for (const key of [...filterKeys, 'page']) next.delete(key);
        setParams(next);
    };
    const rows = (items: TransactionResponse[]) => <SurfaceCard padding="none"><ul className="ct-financial-list">{items.map(transaction => <li key={transaction.id}>
        <FinancialRow title={transaction.description || `${transaction.type} transaction`} to={`/app/transactions/${transaction.id}${search}`}
            type={transaction.type} amount={formatMoney(transaction.amount)} metadata={<><p>{transaction.transactionDate}</p><p>Account: {transaction.accountName}</p></>} categoryName={transaction.categoryName} category={`Category: ${transaction.categoryName}`} />
    </li>)}</ul></SurfaceCard>;
    const dateGroups = new Map<string, TransactionResponse[]>();
    if (sort.startsWith('transactionDate,')) for (const transaction of data?.content ?? []) {
        const group = dateGroups.get(transaction.transactionDate) ?? [];
        group.push(transaction); dateGroups.set(transaction.transactionDate, group);
    }
    function changePage(value: string) { const next = new URLSearchParams(params); next.set('page', value); setParams(next); }
    return <main className="ct-page ct-transactions">
        <PageHeader title="Transactions" actions={firstUse ? undefined : <ButtonLink variant="primary" to={`/app/transactions/create${search}`}>Create transaction</ButtonLink>} />
        {typeof state?.notice === 'string' && <p role="status">{state.notice}</p>}
        {!firstUse && <>
            <div className="ct-transactions-filter-toolbar"><Button variant="secondary" aria-expanded={filtersOpen} aria-controls="transaction-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Filters</Button>
                {activeFilters.length > 0 && <><ul className="ct-active-filters" aria-label="Active filters">{activeFilters.map(label => <li key={label}>{label}</li>)}</ul>{data?.content.length !== 0 && <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>}</>}
            </div>
            <div id="transaction-filters" hidden={!filtersOpen}><SurfaceCard><form key={search} className="ct-filter-grid" noValidate onSubmit={event => {
            event.preventDefault(); const fields = new FormData(event.currentTarget); const next = new URLSearchParams(params);
            for (const key of filterKeys) next.delete(key);
            for (const key of filterKeys) {
                const value = fields.get(key)?.toString(); if (value) next.set(key, value);
            }
            next.set('page', '0'); setParams(next);
        }}>
            <FormField id="filter-type" label="Type">{props => <select {...props} name="type" defaultValue={params.get('type') || ''} className={inputClass}>
                <option value="">All types</option>{transactionTypes.map(type => <option key={type}>{type}</option>)}</select>}</FormField>
            <FormField id="filter-account" label="Account">{props => <select {...props} name="accountId" defaultValue={params.get('accountId') || ''} className={inputClass}>
                <option value="">All accounts</option>{params.get('accountId') && !accounts.some(account => account.id === params.get('accountId')) &&
                    <option value={params.get('accountId')!}>Historical or unavailable account (ID {params.get('accountId')})</option>}
                {accounts.map(account => <option value={account.id} key={account.id}>{account.name}</option>)}</select>}</FormField>
            <FormField id="filter-category" label="Category">{props => <select {...props} name="categoryId" defaultValue={params.get('categoryId') || ''} className={inputClass}>
                <option value="">All categories</option>{params.get('categoryId') && !categories.some(category => category.id === params.get('categoryId')) &&
                    <option value={params.get('categoryId')!}>Historical or unavailable category (ID {params.get('categoryId')})</option>}
                {categories.map(category => <option key={category.id} value={category.id}>{category.name} ({category.type})</option>)}</select>}</FormField>
            <FormField id="filter-sort" label="Sort">{props => <select {...props} name="sort" defaultValue={params.get('sort') || 'transactionDate,desc'} className={inputClass}>
                {transactionSorts.map(sort => <option key={sort} value={sort}>{sortNames[sort.split(',')[0] as keyof typeof sortNames]} {sort.endsWith('asc') ? 'ascending' : 'descending'}</option>)}</select>}</FormField>
            <FormField id="filter-from" label="From date (inclusive)">{props => <input {...props} name="from" type="date" defaultValue={params.get('from') || ''} className={inputClass} />}</FormField>
            <FormField id="filter-to" label="To date (inclusive)">{props => <input {...props} name="to" type="date" defaultValue={params.get('to') || ''} className={inputClass} />}</FormField>
            <FormField id="filter-size" label="Page size">{props => <select {...props} name="size" defaultValue={params.get('size') || '20'} className={inputClass}>
                {params.get('size') && !['5', '10', '20', '50', '100'].includes(params.get('size')!) && <option>{params.get('size')}</option>}
                {['5', '10', '20', '50', '100'].map(size => <option key={size}>{size}</option>)}</select>}</FormField>
            <div className="ct-actions"><Button type="submit">Apply filters</Button></div>
        </form></SurfaceCard></div>
        </>}
        {!firstUse && filtersOpen && resourceError && <ErrorState appearance="clarity" message={`Filter choices unavailable: ${resourceError}. Existing ID filters still work.`} />}
        {currentError ? <ErrorState appearance="clarity" message={currentError} onRetry={() => { setError(null); setPage(null); setAttempt(attempt + 1); }} />
            : !data ? <LoadingState appearance="clarity" message="Loading transactions…" /> : <>
                {data.content.length === 0 ? <EmptyState appearance="clarity" title={firstUse ? 'No transactions yet' : 'No matching transactions'}>
                    {firstUse ? <ButtonLink variant="primary" to={`/app/transactions/create${search}`}>Create transaction</ButtonLink> : <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
                </EmptyState> : dateGroups.size > 0 ? <div className="ct-transaction-groups">{[...dateGroups].sort(([a], [b]) => sort.endsWith('asc') ? a.localeCompare(b) : b.localeCompare(a)).map(([date, items]) => <section key={date} aria-labelledby={`transactions-${date}`}>
                    <h2 id={`transactions-${date}`}><time dateTime={date}>{dateHeading(date)}</time></h2>{rows(items)}
                </section>)}</div> : rows(data.content)}
                {data.content.length > 0 && BigInt(data.totalPages) > 1n && <nav className="ct-pagination" aria-label="Transaction pagination">
                    <Button variant="ghost" size="icon" aria-label="Previous page" title="Previous page" disabled={BigInt(data.number) === 0n} onClick={() => changePage(String(BigInt(data.number) - 1n))}><Icon name="chevron-left" /></Button>
                    <p aria-live="polite">Page {BigInt(data.number) + 1n} of {data.totalPages}</p>
                    <Button variant="ghost" size="icon" aria-label="Next page" title="Next page" disabled={BigInt(data.number) + 1n >= BigInt(data.totalPages)} onClick={() => changePage(String(BigInt(data.number) + 1n))}><Icon name="chevron-right" /></Button>
                </nav>}
            </>}
    </main>;
}
