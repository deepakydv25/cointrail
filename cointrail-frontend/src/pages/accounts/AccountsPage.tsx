import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { getAccounts } from '../../services/accountService';
import type { AccountResponse } from '../../types/account';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<AccountResponse[] | null>(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        getAccounts(controller.signal).then(data => {
            if (!controller.signal.aborted) setAccounts(data);
        }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setError(normalizeApiError(error).message);
        });
        return () => controller.abort();
    }, [attempt]);
    return <main className="mx-auto max-w-5xl space-y-6 break-words px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold">Accounts</h1>
        <p>Create an account first, then review your expense and income categories. Opening balances are starting amounts, not current balances.</p>
        <div className="flex flex-wrap gap-4"><Link className="rounded bg-blue-600 px-4 py-3 text-white" to="/app/accounts/create">Create account</Link>
            <Link className="rounded px-4 py-3 text-blue-700 underline" to="/app/categories">Review categories</Link></div>
        {error ? <ErrorState message={error} onRetry={() => { setError(''); setAccounts(null); setAttempt(attempt + 1); }} />
            : accounts === null ? <LoadingState message="Loading accounts…" />
            : accounts.length === 0 ? <EmptyState title="No active accounts">Create your first account to get started. Deactivated accounts keep their history and reserve their names.</EmptyState>
            : <ul className="grid gap-4 sm:grid-cols-2">{accounts.map(account => <li key={account.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <Link className="text-lg font-semibold text-blue-700 underline" to={`/app/accounts/${account.id}`}>{account.name}</Link>
                <p>{account.type.replaceAll('_', ' ')}</p><p>Opening balance: {formatMoney(account.openingBalance)}</p>
            </li>)}</ul>}
    </main>;
}
