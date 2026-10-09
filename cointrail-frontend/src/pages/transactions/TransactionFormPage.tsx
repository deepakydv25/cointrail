import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getAccounts } from '../../services/accountService';
import { getCategories } from '../../services/categoryService';
import { createTransaction, getTransaction, transactionAmount, updateTransaction } from '../../services/transactionService';
import type { AccountResponse } from '../../types/account';
import type { CategoryResponse } from '../../types/category';
import { transactionTypes } from '../../types/transaction';
import type { TransactionResponse, TransactionType } from '../../types/transaction';
import { ApiError, normalizeApiError } from '../../api/errors';
import { FieldError, FormError } from '../../components/ui/FormFeedback';
import { ErrorState, LoadingState } from '../../components/ui/States';
import CategorySelect from '../../components/CategorySelect';
import { isDate } from './query';

export default function TransactionFormPage() {
    const { id } = useParams(); const { search } = useLocation(); const navigate = useNavigate();
    const [resources, setResources] = useState<{ accounts: AccountResponse[]; categories: CategoryResponse[] } | null>(null);
    const [original, setOriginal] = useState<TransactionResponse | null>(null);
    const [type, setType] = useState<TransactionType>('EXPENSE');
    const [accountId, setAccountId] = useState(''); const [categoryId, setCategoryId] = useState('');
    const [amount, setAmount] = useState(''); const [description, setDescription] = useState(''); const [transactionDate, setDate] = useState('');
    const [error, setError] = useState<ApiError | null>(null); const [loadError, setLoadError] = useState('');
    const [pending, setPending] = useState(false); const [attempt, setAttempt] = useState(0);
    const initialized = useRef(false); const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        const controller = new AbortController();
        Promise.all([getAccounts(controller.signal), getCategories(controller.signal),
            id && !initialized.current ? getTransaction(id, controller.signal) : Promise.resolve(null)]).then(([accounts, categories, transaction]) => {
            if (controller.signal.aborted) return;
            setResources({ accounts: accounts.filter(account => account.active), categories: categories.filter(category => category.active) });
            if (transaction && !initialized.current) {
                setOriginal(transaction); setType(transaction.type); setAccountId(accounts.some(account => account.active && account.id === transaction.accountId) ? transaction.accountId : '');
                setCategoryId(categories.some(category => category.active && category.type === transaction.type && category.id === transaction.categoryId) ? transaction.categoryId : '');
                setAmount(transaction.amount); setDescription(transaction.description ?? ''); setDate(transaction.transactionDate);
            }
            initialized.current = true; setLoadError('');
        }).catch(error => { if (!controller.signal.aborted && !axios.isCancel(error)) setLoadError(normalizeApiError(error).message); });
        return () => controller.abort();
    }, [id, attempt]);
    const inputClass = 'mt-1 w-full rounded-lg border bg-white px-4 py-3';
    const fields = ['type', 'accountId', 'categoryId', 'amount', 'description', 'transactionDate'];
    const eligibleAccount = resources?.accounts.some(account => account.id === accountId);
    const eligibleCategory = resources?.categories.some(category => category.id === categoryId && category.type === type);
    return <main className="mx-auto max-w-xl space-y-6 break-words px-4 py-8">
        <h1 className="text-3xl font-bold">{id ? 'Edit transaction' : 'Create transaction'}</h1>
        <Link className="text-blue-700 underline" to={id ? `/app/transactions/${id}${search}` : `/app/transactions${search}`}>Cancel</Link>
        {loadError && <ErrorState message={loadError} onRetry={() => { setLoadError(''); setAttempt(attempt + 1); }} />}
        {!resources || (id && !original) ? !loadError && <LoadingState message="Loading transaction resources…" /> : <>
            {resources.accounts.length === 0 && <p>No active accounts. <Link className="text-blue-700 underline" to="/app/accounts/create">Create an account</Link> before saving a transaction.</p>}
            {!resources.categories.some(category => category.type === type) && <p>No active {type.toLowerCase()} categories. <Link className="text-blue-700 underline" to="/app/categories/create">Create a custom category</Link>.</p>}
            <form className="space-y-5 rounded-xl border bg-white p-6" noValidate onSubmit={async event => {
                event.preventDefault(); if (pending) return; setError(null);
                const fieldErrors: Record<string, string> = {};
                if (!eligibleAccount) fieldErrors.accountId = 'Choose an active account.';
                if (!eligibleCategory) fieldErrors.categoryId = `Choose an active ${type.toLowerCase()} category.`;
                try { transactionAmount(amount); } catch (error) { fieldErrors.amount = normalizeApiError(error).fieldErrors.amount; }
                if (!isDate(transactionDate)) fieldErrors.transactionDate = 'Enter a valid transaction date.';
                if (description.length > 500) fieldErrors.description = 'Description must not exceed 500 characters.';
                if (Object.keys(fieldErrors).length) { setError(new ApiError('Check your input.', 'validation', 400, fieldErrors)); return; }
                setPending(true);
                try {
                    const request = { type, accountId, categoryId, amount, description: description === '' ? null : description, transactionDate };
                    const saved = id ? await updateTransaction(id, request) : await createTransaction(request);
                    if (mounted.current) navigate(`/app/transactions/${saved.id}${search}`);
                } catch (error) { if (mounted.current && !axios.isCancel(error)) setError(normalizeApiError(error)); }
                finally { if (mounted.current) setPending(false); }
            }}>
                {original && <section aria-label="Original transaction references" className="rounded bg-gray-50 p-3">
                    <p>Recorded account: {original.accountName}</p><p>Recorded category: {original.categoryName}</p>
                    {!resources.accounts.some(account => account.id === original.accountId) && <p>The recorded account is unavailable for editing. Choose an active replacement.</p>}
                    {!resources.categories.some(category => category.id === original.categoryId && category.type === original.type) && <p>The recorded category is unavailable for editing. Choose an active replacement.</p>}
                </section>}
                <div><label htmlFor="type">Type</label><select id="type" className={inputClass} value={type} onChange={event => { setType(event.target.value as TransactionType); setCategoryId(''); }}
                    aria-invalid={!!error?.fieldErrors.type} aria-describedby="type-error">{transactionTypes.map(type => <option key={type}>{type}</option>)}</select><FieldError field="type" error={error} /></div>
                <div><label htmlFor="accountId">Account</label><select id="accountId" required className={inputClass} value={eligibleAccount ? accountId : ''} onChange={event => setAccountId(event.target.value)}
                    aria-invalid={!!error?.fieldErrors.accountId} aria-describedby="accountId-error"><option value="">Select an active account</option>
                    {resources.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select><FieldError field="accountId" error={error} /></div>
                <CategorySelect categories={resources.categories} type={type} value={eligibleCategory ? categoryId : ''} onChange={setCategoryId} error={error} /><FieldError field="categoryId" error={error} />
                <div><label htmlFor="amount">Amount (INR)</label><input id="amount" required type="text" inputMode="decimal" className={inputClass} value={amount} onChange={event => setAmount(event.target.value)}
                    aria-invalid={!!error?.fieldErrors.amount} aria-describedby="amount-help amount-error" />
                    <p id="amount-help" className="text-sm text-gray-600">Positive amount, up to 17 integer digits and 2 decimal places. Minimum 0.01.</p><FieldError field="amount" error={error} /></div>
                <div><label htmlFor="transactionDate">Transaction date</label><input id="transactionDate" type="date" required className={inputClass} value={transactionDate} onChange={event => setDate(event.target.value)}
                    aria-invalid={!!error?.fieldErrors.transactionDate} aria-describedby="transactionDate-help transactionDate-error" />
                    <p id="transactionDate-help" className="text-sm text-gray-600">Today or earlier according to the server. The server validates this date.</p><FieldError field="transactionDate" error={error} /></div>
                <div><label htmlFor="description">Description (optional)</label><textarea id="description" maxLength={500} className={inputClass} value={description} onChange={event => setDescription(event.target.value)}
                    aria-invalid={!!error?.fieldErrors.description} aria-describedby="description-error" /><FieldError field="description" error={error} /></div>
                <FormError error={error} fields={fields} />
                <div className="flex flex-wrap gap-3"><button disabled={pending || !!loadError} className="rounded bg-blue-600 px-5 py-3 text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save transaction'}</button>
                    <button type="button" disabled={pending} className="rounded border px-4 py-3" onClick={() => setAttempt(attempt + 1)}>Refresh eligible resources</button></div>
            </form>
        </>}
    </main>;
}
