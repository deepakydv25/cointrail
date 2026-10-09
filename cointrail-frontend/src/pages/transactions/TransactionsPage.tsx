import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getTransactions } from '../../services/transactionService';
import { getAccounts } from '../../services/accountService';
import { getCategories } from '../../services/categoryService';
import type { AccountResponse } from '../../types/account';
import type { CategoryResponse } from '../../types/category';
import { transactionSorts, transactionTypes } from '../../types/transaction';
import type { TransactionPage } from '../../types/transaction';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { transactionQuery } from './query';

export default function TransactionsPage() {
    const { search, state } = useLocation();
    const [params, setParams] = useSearchParams();
    const [page, setPage] = useState<{ search: string; data: TransactionPage } | null>(null);
    const [error, setError] = useState<{ search: string; message: string } | null>(null);
    const [attempt, setAttempt] = useState(0);
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
    const inputClass = 'mt-1 w-full rounded-lg border bg-white px-3 py-2';
    const sortNames = { transactionDate: 'Transaction date', amount: 'Amount', createdAt: 'Created date', updatedAt: 'Updated date' };
    function changePage(value: string) { const next = new URLSearchParams(params); next.set('page', value); setParams(next); }
    return <main className="mx-auto max-w-6xl space-y-6 break-words px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p>V2 expense and income transactions. Legacy expenses remain separate.</p>
        {typeof state?.notice === 'string' && <p role="status">{state.notice}</p>}
        <Link className="inline-block rounded bg-blue-600 px-4 py-3 text-white" to={`/app/transactions/create${search}`}>Create transaction</Link>
        <form key={search} className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4" noValidate onSubmit={event => {
            event.preventDefault(); const fields = new FormData(event.currentTarget); const next = new URLSearchParams();
            for (const key of ['type', 'accountId', 'categoryId', 'from', 'to', 'size', 'sort']) {
                const value = fields.get(key)?.toString(); if (value) next.set(key, value);
            }
            next.set('page', '0'); setParams(next);
        }}>
            <div><label htmlFor="filter-type">Type</label><select id="filter-type" name="type" defaultValue={params.get('type') || ''} className={inputClass}>
                <option value="">All types</option>{transactionTypes.map(type => <option key={type}>{type}</option>)}</select></div>
            <div><label htmlFor="filter-account">Account</label><select id="filter-account" name="accountId" defaultValue={params.get('accountId') || ''} className={inputClass}>
                <option value="">All accounts</option>{params.get('accountId') && !accounts.some(account => account.id === params.get('accountId')) &&
                    <option value={params.get('accountId')!}>Historical or unavailable account (ID {params.get('accountId')})</option>}
                {accounts.map(account => <option value={account.id} key={account.id}>{account.name}</option>)}</select></div>
            <div><label htmlFor="filter-category">Category</label><select id="filter-category" name="categoryId" defaultValue={params.get('categoryId') || ''} className={inputClass}>
                <option value="">All categories</option>{params.get('categoryId') && !categories.some(category => category.id === params.get('categoryId')) &&
                    <option value={params.get('categoryId')!}>Historical or unavailable category (ID {params.get('categoryId')})</option>}
                {categories.map(category => <option key={category.id} value={category.id}>{category.name} ({category.type})</option>)}</select></div>
            <div><label htmlFor="filter-sort">Sort</label><select id="filter-sort" name="sort" defaultValue={params.get('sort') || 'transactionDate,desc'} className={inputClass}>
                {transactionSorts.map(sort => <option key={sort} value={sort}>{sortNames[sort.split(',')[0] as keyof typeof sortNames]} {sort.endsWith('asc') ? 'ascending' : 'descending'}</option>)}</select></div>
            <div><label htmlFor="filter-from">From date (inclusive)</label><input id="filter-from" name="from" type="date" defaultValue={params.get('from') || ''} className={inputClass} /></div>
            <div><label htmlFor="filter-to">To date (inclusive)</label><input id="filter-to" name="to" type="date" defaultValue={params.get('to') || ''} className={inputClass} /></div>
            <div><label htmlFor="filter-size">Page size</label><select id="filter-size" name="size" defaultValue={params.get('size') || '20'} className={inputClass}>
                {params.get('size') && !['5', '10', '20', '50', '100'].includes(params.get('size')!) && <option>{params.get('size')}</option>}
                {['5', '10', '20', '50', '100'].map(size => <option key={size}>{size}</option>)}</select></div>
            <div className="flex items-end gap-3"><button className="rounded bg-blue-600 px-4 py-3 text-white">Apply filters</button>
                <button type="button" className="rounded border px-4 py-3" onClick={() => setParams({})}>Clear filters</button></div>
        </form>
        {resourceError && <ErrorState message={`Filter choices unavailable: ${resourceError}. Existing ID filters still work.`} />}
        {currentError ? <ErrorState message={currentError} onRetry={() => { setError(null); setPage(null); setAttempt(attempt + 1); }} />
            : !data ? <LoadingState message="Loading transactions…" /> : <>
                {data.content.length === 0 ? <EmptyState title="No transactions">No transactions match these filters. Clear filters or create a transaction.</EmptyState>
                    : <ul className="grid gap-4 sm:grid-cols-2">{data.content.map(transaction => <li key={transaction.id} className="space-y-2 rounded-xl border bg-white p-5">
                        <Link className="text-lg font-semibold text-blue-700 underline" to={`/app/transactions/${transaction.id}${search}`}>{transaction.description || `${transaction.type} transaction`}</Link>
                        <p>{transaction.type} · {formatMoney(transaction.amount)} · {transaction.transactionDate}</p>
                        <p>Account: {transaction.accountName}</p><p>Category: {transaction.categoryName}</p>
                    </li>)}</ul>}
                <div className="flex flex-wrap items-center gap-4" aria-label="Transaction pagination">
                    <p>{data.totalElements} transactions · {data.totalPages === '0' ? 'No result pages' : `Page ${BigInt(data.number) + 1n} of ${data.totalPages}`}</p>
                    <button className="rounded border px-4 py-3 disabled:opacity-50" disabled={BigInt(data.number) === 0n} onClick={() => changePage(String(BigInt(data.number) - 1n))}>Previous page</button>
                    <button className="rounded border px-4 py-3 disabled:opacity-50" disabled={BigInt(data.number) + 1n >= BigInt(data.totalPages)} onClick={() => changePage(String(BigInt(data.number) + 1n))}>Next page</button>
                </div>
            </>}
    </main>;
}
