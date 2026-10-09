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
    const inputClass = 'ct-control';
    const sortNames = { transactionDate: 'Transaction date', amount: 'Amount', createdAt: 'Created date', updatedAt: 'Updated date' };
    function changePage(value: string) { const next = new URLSearchParams(params); next.set('page', value); setParams(next); }
    return <main className="ct-page">
        <PageHeader title="Transactions" description="V2 expense and income transactions. Legacy expenses remain separate." actions={<ButtonLink variant="primary" to={`/app/transactions/create${search}`}>Create transaction</ButtonLink>} />
        {typeof state?.notice === 'string' && <p role="status">{state.notice}</p>}
        <SurfaceCard><form key={search} className="ct-filter-grid" noValidate onSubmit={event => {
            event.preventDefault(); const fields = new FormData(event.currentTarget); const next = new URLSearchParams();
            for (const key of ['type', 'accountId', 'categoryId', 'from', 'to', 'size', 'sort']) {
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
            <div className="ct-actions"><Button type="submit">Apply filters</Button>
                <Button variant="secondary" onClick={() => setParams({})}>Clear filters</Button></div>
        </form></SurfaceCard>
        {resourceError && <ErrorState appearance="clarity" message={`Filter choices unavailable: ${resourceError}. Existing ID filters still work.`} />}
        {currentError ? <ErrorState appearance="clarity" message={currentError} onRetry={() => { setError(null); setPage(null); setAttempt(attempt + 1); }} />
            : !data ? <LoadingState appearance="clarity" message="Loading transactions…" /> : <>
                {data.content.length === 0 ? <EmptyState appearance="clarity" title="No transactions">No transactions match these filters. Clear filters or create a transaction.</EmptyState>
                    : <SurfaceCard padding="none"><ul className="ct-financial-list">{data.content.map(transaction => <li key={transaction.id}>
                        <FinancialRow title={transaction.description || `${transaction.type} transaction`} to={`/app/transactions/${transaction.id}${search}`}
                            type={transaction.type} amount={formatMoney(transaction.amount)} metadata={<><p>{transaction.transactionDate}</p><p>Account: {transaction.accountName}</p></>} category={`Category: ${transaction.categoryName}`} />
                    </li>)}</ul></SurfaceCard>}
                <div className="ct-pagination" aria-label="Transaction pagination">
                    <p>{data.totalElements} transactions · {data.totalPages === '0' ? 'No result pages' : `Page ${BigInt(data.number) + 1n} of ${data.totalPages}`}</p>
                    <Button variant="secondary" disabled={BigInt(data.number) === 0n} onClick={() => changePage(String(BigInt(data.number) - 1n))}>Previous page</Button>
                    <Button variant="secondary" disabled={BigInt(data.number) + 1n >= BigInt(data.totalPages)} onClick={() => changePage(String(BigInt(data.number) + 1n))}>Next page</Button>
                </div>
            </>}
    </main>;
}
