import CategoryIcon from '../../components/CategoryIcon';
import { ConfirmationPanel } from '../../components/ui/ConfirmationPanel';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button, ButtonLink } from '../../components/ui/Button';
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
    return <main className="ct-page ct-page--narrow">
        <PageHeader title="Transaction details" back={<Link to={`/app/transactions${search}`}>Back to transactions</Link>} />
        {error && <ErrorState appearance="clarity" message={error} onRetry={!transaction ? () => { setError(''); setAttempt(attempt + 1); } : undefined} />}
        {!transaction ? !error && <LoadingState appearance="clarity" /> : <SurfaceCard className="ct-stack">
            <h2>{transaction.type} · <span className={`ct-amount ct-amount--${transaction.type.toLowerCase()}`}>{formatMoney(transaction.amount)}</span></h2>
            <p>Date: {transaction.transactionDate}</p><p>Description: {transaction.description ?? 'No description'}</p>
            <p>Account: {transaction.accountName}</p><div className="ct-category-heading"><CategoryIcon size="small" /><p>Category: {transaction.categoryName}</p></div>
            <p className="ct-meta ct-description">Historical account and category names remain available even if the resources are no longer active.</p>
            <p className="ct-meta ct-description">Created: {transaction.createdAt}<br />Updated: {transaction.updatedAt}</p>
            <ButtonLink to={`/app/transactions/${transaction.id}/edit${search}`}>Edit transaction</ButtonLink>
            <Button ref={deleteButton} hidden={confirm} variant="danger" onClick={() => setConfirm(true)}>Delete transaction</Button>
            {confirm && <ConfirmationPanel title="Permanently delete this transaction?" keepLabel="Keep transaction" confirmLabel={pending ? 'Deleting…' : 'Confirm permanent deletion'} pending={pending} triggerRef={deleteButton} onCancel={() => setConfirm(false)} onConfirm={async event => {
                event.preventDefault(); if (pending) return; setPending(true); setError('');
                try {
                    await deleteTransaction(transaction.id);
                    if (mounted.current) navigate(`/app/transactions${search}`, { state: { notice: 'Transaction permanently deleted.' } });
                } catch (error) { if (mounted.current && !axios.isCancel(error)) setError(normalizeApiError(error).message); }
                finally { if (mounted.current) setPending(false); }
            }}>
                <p>This removes the financial record and cannot be undone. If it was created by a recurring schedule, its processed occurrence will not be regenerated.</p>
            </ConfirmationPanel>}
        </SurfaceCard>}
    </main>;
}
