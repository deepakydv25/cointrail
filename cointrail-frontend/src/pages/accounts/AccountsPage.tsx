import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { ButtonLink } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/Icon';
import { getAccounts } from '../../services/accountService';
import type { AccountResponse, AccountType } from '../../types/account';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';

function openingBalanceTotal(accounts: AccountResponse[]): string {
    const cents = accounts.reduce((sum, account) => {
        const negative = account.openingBalance.startsWith('-');
        const [whole, fraction = ''] = (negative ? account.openingBalance.slice(1) : account.openingBalance).split('.');
        const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
        return sum + (negative ? -amount : amount);
    }, 0n);
    const absolute = cents < 0n ? -cents : cents;
    return `${cents < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

const accountIcons: Record<AccountType, IconName> = { BANK: 'landmark', CASH: 'account', CREDIT_CARD: 'receipt', WALLET: 'account' };

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<AccountResponse[] | null>(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        getAccounts(controller.signal).then(data => { if (!controller.signal.aborted) setAccounts(data); }).catch(caught => {
            if (!controller.signal.aborted && !axios.isCancel(caught)) setError(normalizeApiError(caught).message);
        });
        return () => controller.abort();
    }, [attempt]);
    return <main className="ct-page ct-stack">
        <PageHeader title="Accounts" actions={<ButtonLink variant="primary" to="/app/accounts/create">+ Add account</ButtonLink>} />
        {error ? <ErrorState appearance="clarity" message={error} onRetry={() => { setError(''); setAccounts(null); setAttempt(attempt + 1); }} />
            : accounts === null ? <LoadingState appearance="clarity" message="Loading accounts…" />
            : accounts.length === 0 ? <EmptyState appearance="clarity" title="No accounts yet">Add an account to track your finances.</EmptyState>
            : <>
                <SurfaceCard padding="compact" className="ct-account-total"><div><p className="ct-label">Total opening balances</p><p className="ct-metric">{formatMoney(openingBalanceTotal(accounts))}</p></div><p className="ct-description">Starting amounts only · not live bank balances</p></SurfaceCard>
                <SurfaceCard padding="none"><ul className="ct-resource-list ct-account-list">{accounts.map(account => <li key={account.id} className="ct-resource-row">
                    <span aria-hidden="true" className="ct-category-icon ct-category-icon--small"><Icon name={accountIcons[account.type]} /></span>
                    <div className="ct-resource-row-main"><Link className="ct-resource-row-title" to={`/app/accounts/${account.id}`}>{account.name}</Link><p className="ct-resource-row-meta">{account.type.replaceAll('_', ' ')}</p></div>
                    <p className="ct-resource-row-balance"><span className="ct-resource-row-meta">Opening balance</span><strong className="ct-amount ct-amount--neutral">{formatMoney(account.openingBalance)}</strong></p>
                </li>)}</ul></SurfaceCard>
            </>}
    </main>;
}
