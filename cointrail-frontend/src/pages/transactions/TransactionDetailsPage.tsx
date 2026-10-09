import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { deleteTransaction, getTransaction } from '../../services/transactionService';
import type { TransactionResponse } from '../../types/transaction';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { ErrorState, LoadingState } from '../../components/ui/States';

export default function TransactionDetailsPage() {
    const { id = '' } = useParams(); const { search } = useLocation(); const navigate = useNavigate();
    const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
    const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
    const [confirm, setConfirm] = useState(false); const [pending, setPending] = useState(false);
    const deleteButton = useRef<HTMLButtonElement>(null); const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        const controller = new AbortController();
        getTransaction(id, controller.signal).then(data => { if (!controller.signal.aborted) setTransaction(data); }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setError(normalizeApiError(error).message);
        });
        return () => controller.abort();
    }, [id, attempt]);
    return <main className="mx-auto max-w-xl space-y-6 break-words px-4 py-8">
        <h1 className="text-3xl font-bold">Transaction details</h1>
        <Link className="text-blue-700 underline" to={`/app/transactions${search}`}>Back to transactions</Link>
        {error && <ErrorState message={error} onRetry={!transaction ? () => { setError(''); setAttempt(attempt + 1); } : undefined} />}
        {!transaction ? !error && <LoadingState /> : <section className="space-y-4 rounded-xl border bg-white p-6">
            <h2 className="text-xl font-semibold">{transaction.type} · {formatMoney(transaction.amount)}</h2>
            <p>Date: {transaction.transactionDate}</p><p>Description: {transaction.description ?? 'No description'}</p>
            <p>Account: {transaction.accountName}</p><p>Category: {transaction.categoryName}</p>
            <p className="text-sm text-gray-600">Historical account and category names remain available even if the resources are no longer active.</p>
            <p className="text-sm text-gray-600">Created: {transaction.createdAt}<br />Updated: {transaction.updatedAt}</p>
            <Link className="inline-block rounded border px-4 py-3 text-blue-700" to={`/app/transactions/${transaction.id}/edit${search}`}>Edit transaction</Link>
            <button ref={deleteButton} hidden={confirm} className="ml-3 rounded border px-4 py-3 text-red-700" onClick={() => setConfirm(true)}>Delete transaction</button>
            {confirm && <form className="space-y-3 rounded border border-red-200 p-4" onSubmit={async event => {
                event.preventDefault(); if (pending) return; setPending(true); setError('');
                try {
                    await deleteTransaction(transaction.id);
                    if (mounted.current) navigate(`/app/transactions${search}`, { state: { notice: 'Transaction permanently deleted.' } });
                } catch (error) { if (mounted.current && !axios.isCancel(error)) setError(normalizeApiError(error).message); }
                finally { if (mounted.current) setPending(false); }
            }}>
                <h3 className="font-semibold">Permanently delete this transaction?</h3>
                <p>This removes the financial record and cannot be undone. If it was created by a recurring schedule, its processed occurrence will not be regenerated.</p>
                <button autoFocus type="button" disabled={pending} className="rounded border px-4 py-3" onClick={() => { setConfirm(false); requestAnimationFrame(() => deleteButton.current?.focus()); }}>Keep transaction</button>
                <button disabled={pending} className="ml-3 rounded bg-red-600 px-4 py-3 text-white">{pending ? 'Deleting…' : 'Confirm permanent deletion'}</button>
            </form>}
        </section>}
    </main>;
}
