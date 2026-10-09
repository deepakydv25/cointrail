import { ConfirmationPanel } from '../../components/ui/ConfirmationPanel';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button, ButtonLink } from '../../components/ui/Button';
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
    const page = useRef<HTMLElement>(null);
    const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        const controller = new AbortController();
        getAccount(id, controller.signal).then(data => { if (!controller.signal.aborted) setAccount(data); }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setError(normalizeApiError(error).message);
        });
        return () => controller.abort();
    }, [id, attempt]);
    return <main ref={page} className="ct-page ct-page--narrow">
        <PageHeader title="Account details" back={<Link to="/app/accounts">Back to accounts</Link>} />
        {error && <ErrorState appearance="clarity" message={error} onRetry={!account ? () => { setError(''); setAttempt(attempt + 1); } : undefined} />}
        {!account ? !error && <LoadingState appearance="clarity" /> : <SurfaceCard className="ct-stack">
            <h2>{account.name}</h2><p>{account.type.replaceAll('_', ' ')}</p>
            <p className="ct-amount ct-amount--neutral">Opening balance: {formatMoney(account.openingBalance)} (immutable starting amount)</p>
            <p>{account.active ? 'Active' : 'Inactive — financial history is preserved. This account cannot be selected for new transactions.'}</p>
            <p className="ct-meta ct-description">Created: {account.createdAt}<br />Updated: {account.updatedAt}</p>
            <ButtonLink to={`/app/accounts/${account.id}/edit`}>Edit account</ButtonLink>
            {account.active && <Button ref={deactivateButton} hidden={confirm} variant="danger" onClick={() => setConfirm(true)}>Deactivate account</Button>}
            {account.active && confirm && <ConfirmationPanel title={`Deactivate ${account.name}?`} keepLabel="Keep account active" confirmLabel={pending ? 'Deactivating…' : 'Confirm deactivation'} pending={pending} triggerRef={deactivateButton} onCancel={() => setConfirm(false)} onConfirm={async event => {
                event.preventDefault(); if (pending) return; setPending(true); setError('');
                try {
                    await deactivateAccount(account.id);
                    if (!mounted.current) return;
                    setConfirm(false);
                    // Refetch the authoritative inactive detail after the successful mutation.
                    setAccount(null); setAttempt(attempt + 1);
                    requestAnimationFrame(() => { if (mounted.current) page.current?.querySelector('h1')?.focus(); });
                } catch (error) { if (mounted.current && !axios.isCancel(error)) setError(normalizeApiError(error).message); }
                finally { if (mounted.current) setPending(false); }
            }}>
                <p>Existing financial history remains. The account will leave the active list and cannot be used for new transactions. Its name remains reserved. There is no restore action.</p>
            </ConfirmationPanel>}
        </SurfaceCard>}
    </main>;
}
