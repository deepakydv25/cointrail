import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { ButtonLink } from '../../components/ui/Button';
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
    return <main className="ct-page">
        <PageHeader title="Accounts" description="Create an account first, then review your expense and income categories. Opening balances are starting amounts, not current balances."
            actions={<><ButtonLink variant="primary" to="/app/accounts/create">Create account</ButtonLink><ButtonLink to="/app/categories">Review categories</ButtonLink></>} />
        {error ? <ErrorState appearance="clarity" message={error} onRetry={() => { setError(''); setAccounts(null); setAttempt(attempt + 1); }} />
            : accounts === null ? <LoadingState appearance="clarity" message="Loading accounts…" />
            : accounts.length === 0 ? <EmptyState appearance="clarity" title="No active accounts">Create your first account to get started. Deactivated accounts keep their history and reserve their names.</EmptyState>
            : <ul className="ct-grid">{accounts.map(account => <li key={account.id}><SurfaceCard className="ct-stack">
                <Link className="ct-row-title" to={`/app/accounts/${account.id}`}>{account.name}</Link>
                <p className="ct-meta">{account.type.replaceAll('_', ' ')}</p><p className="ct-amount ct-amount--neutral">Opening balance: {formatMoney(account.openingBalance)}</p>
            </SurfaceCard>
            </li>)}</ul>}
    </main>;
}
