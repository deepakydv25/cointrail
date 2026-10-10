import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button } from '../../components/ui/Button';
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
import { FormError } from '../../components/ui/FormFeedback';
import { FormField } from '../../components/ui/FormField';
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
    const inputClass = 'ct-control';
    const fields = ['type', 'accountId', 'categoryId', 'amount', 'description', 'transactionDate'];
    const eligibleAccount = resources?.accounts.some(account => account.id === accountId);
    const eligibleCategory = resources?.categories.some(category => category.id === categoryId && category.type === type);
    return <main className="ct-page ct-page--narrow">
        <PageHeader title={id ? 'Edit transaction' : 'Add transaction'} back={<Link to={id ? `/app/transactions/${id}${search}` : `/app/transactions${search}`}>Cancel</Link>} />
        {loadError && <ErrorState appearance="clarity" message={loadError} onRetry={() => { setLoadError(''); setAttempt(attempt + 1); }} />}
        {!resources || (id && !original) ? !loadError && <LoadingState appearance="clarity" message="Loading transaction resources…" /> : <>
            {resources.accounts.length === 0 && <p>No active accounts. <Link className="ct-link" to="/app/accounts/create">Create an account</Link> before saving a transaction.</p>}
            {!resources.categories.some(category => category.type === type) && <p>No active {type.toLowerCase()} categories. <Link className="ct-link" to="/app/categories/create">Create a custom category</Link>.</p>}
            <SurfaceCard><form className="ct-stack" noValidate onSubmit={async event => {
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
                {original && <section aria-label="Original transaction references" className="ct-feedback">
                    <p>Recorded account: {original.accountName}</p><p>Recorded category: {original.categoryName}</p>
                    {!resources.accounts.some(account => account.id === original.accountId) && <p>The recorded account is unavailable for editing. Choose an active replacement.</p>}
                    {!resources.categories.some(category => category.id === original.categoryId && category.type === original.type) && <p>The recorded category is unavailable for editing. Choose an active replacement.</p>}
                </section>}
                <FormField id="type" label="Type" error={error?.fieldErrors.type}>{props => <select {...props} className={inputClass} value={type} onChange={event => { setType(event.target.value as TransactionType); setCategoryId(''); }}>
                    {transactionTypes.map(type => <option key={type}>{type}</option>)}</select>}</FormField>
                <FormField id="accountId" label="Account" error={error?.fieldErrors.accountId}>{props => <select {...props} required className={inputClass} value={eligibleAccount ? accountId : ''} onChange={event => setAccountId(event.target.value)}>
                    <option value="">Select an active account</option>{resources.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>}</FormField>
                <CategorySelect categories={resources.categories} type={type} value={eligibleCategory ? categoryId : ''} onChange={setCategoryId} error={error} />
                <FormField id="amount" label="Amount (INR)" error={error?.fieldErrors.amount} hint="Positive amount, up to 17 integer digits and 2 decimal places. Minimum 0.01.">{props =>
                    <input {...props} required type="text" inputMode="decimal" className={inputClass} value={amount} onChange={event => setAmount(event.target.value)} />}</FormField>
                <FormField id="transactionDate" label="Transaction date" error={error?.fieldErrors.transactionDate} hint="Today or earlier according to the server. The server validates this date.">{props =>
                    <input {...props} type="date" required className={inputClass} value={transactionDate} onChange={event => setDate(event.target.value)} />}</FormField>
                <FormField id="description" label="Description (optional)" error={error?.fieldErrors.description}>{props =>
                    <textarea {...props} maxLength={500} className={inputClass} value={description} onChange={event => setDescription(event.target.value)} />}</FormField>
                <FormError appearance="clarity" error={error} fields={fields} />
                <div className="ct-actions"><Button type="submit" pending={pending} disabled={!!loadError}>{pending ? 'Saving…' : 'Save transaction'}</Button>
                    <Button variant="secondary" disabled={pending} onClick={() => setAttempt(attempt + 1)}>Refresh eligible resources</Button></div>
            </form></SurfaceCard>
        </>}
    </main>;
}
