import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { deactivateAccount, getAccount } from '../../services/accountService';
import type { AccountResponse } from '../../types/account';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { ErrorState, LoadingState } from '../../components/ui/States';

export default function AccountDetailsPage() {
    const { id = '' } = useParams();
    const [account, setAccount] = useState<AccountResponse | null>(null);
    const [error, setError] = useState('');
    const [confirm, setConfirm] = useState(false);
    const [pending, setPending] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const deactivateButton = useRef<HTMLButtonElement>(null);
    const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        const controller = new AbortController();
        getAccount(id, controller.signal).then(data => { if (!controller.signal.aborted) setAccount(data); }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setError(normalizeApiError(error).message);
        });
        return () => controller.abort();
    }, [id, attempt]);
    return <main className="mx-auto max-w-xl space-y-6 break-words px-4 py-8">
        <h1 className="text-3xl font-bold">Account details</h1><Link className="text-blue-700 underline" to="/app/accounts">Back to accounts</Link>
        {error && <ErrorState message={error} onRetry={!account ? () => { setError(''); setAttempt(attempt + 1); } : undefined} />}
        {!account ? !error && <LoadingState /> : <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold">{account.name}</h2><p>{account.type.replaceAll('_', ' ')}</p>
            <p>Opening balance: {formatMoney(account.openingBalance)} (immutable starting amount)</p>
            <p>{account.active ? 'Active' : 'Inactive — financial history is preserved. This account cannot be selected for new transactions.'}</p>
            <p className="text-sm text-gray-600">Created: {account.createdAt}<br />Updated: {account.updatedAt}</p>
            <Link className="inline-block rounded border px-4 py-3 text-blue-700" to={`/app/accounts/${account.id}/edit`}>Edit account</Link>
            {account.active && <button ref={deactivateButton} hidden={confirm} className="ml-3 rounded border px-4 py-3 text-red-700" onClick={() => setConfirm(true)}>Deactivate account</button>}
            {account.active && confirm && <form className="space-y-3 rounded border border-red-200 p-4" onSubmit={async event => {
                event.preventDefault(); if (pending) return; setPending(true); setError('');
                try {
                    await deactivateAccount(account.id);
                    if (!mounted.current) return;
                    setConfirm(false);
                    // Refetch the authoritative inactive detail after the successful mutation.
                    setAccount(null); setAttempt(attempt + 1);
                } catch (error) { if (mounted.current && !axios.isCancel(error)) setError(normalizeApiError(error).message); }
                finally { if (mounted.current) setPending(false); }
            }}>
                <h3 className="font-semibold">Deactivate {account.name}?</h3>
                <p>Existing financial history remains. The account will leave the active list and cannot be used for new transactions. Its name remains reserved. There is no restore action.</p>
                <button autoFocus disabled={pending} type="button" className="rounded border px-4 py-3" onClick={() => {
                    setConfirm(false); requestAnimationFrame(() => deactivateButton.current?.focus());
                }}>Keep account active</button>
                <button disabled={pending} className="ml-3 rounded bg-red-600 px-4 py-3 text-white">{pending ? 'Deactivating…' : 'Confirm deactivation'}</button>
            </form>}
        </section>}
    </main>;
}
