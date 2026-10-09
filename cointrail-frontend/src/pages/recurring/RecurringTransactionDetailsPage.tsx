import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getRecurringTransaction, pauseRecurringTransaction, resumeRecurringTransaction, cancelRecurringTransaction } from '../../services/recurringTransactionService';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button, ButtonLink } from '../../components/ui/Button';
import { ConfirmationPanel } from '../../components/ui/ConfirmationPanel';
import { ErrorState, LoadingState } from '../../components/ui/States';
import CategoryIcon from '../../components/CategoryIcon';
import { isTerminal, type RecurringTransactionResponse } from '../../types/recurringTransaction';
import { recurringQuery, recurringSearch } from './query';

type Action = 'Pause' | 'Resume' | 'Cancel';
const explanations = {
    Pause: 'Pausing stops posting while paused. On later resume, paused dates are skipped. Pausing a blocked rule also replaces backlog recovery with these pause semantics.',
    Resume: 'The server chooses the next anchored date on or after recurring today, skipping paused dates. The rule may become completed if no occurrence remains. Resources are revalidated.',
    Cancel: 'Cancellation stops future generation and retains this rule. Existing generated transactions remain unchanged. This cannot be resumed.',
};
function RuleDetails({ id, context }: { id: string; context: string }) {
    const navigate = useNavigate(); const { state } = useLocation(); const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ attempt: number; rule?: RecurringTransactionResponse; error?: string } | null>(null);
    const [action, setAction] = useState<Action | null>(null); const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
    const trigger = useRef<HTMLButtonElement>(null); const refresh = useRef<HTMLButtonElement>(null); const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        const controller = new AbortController();
        getRecurringTransaction(id, controller.signal).then(rule => { if (!controller.signal.aborted) setResult({ attempt, rule }); }).catch(caught => {
            if (!controller.signal.aborted && !axios.isCancel(caught)) setResult({ attempt, error: normalizeApiError(caught).message });
        }); return () => controller.abort();
    }, [id, attempt]);
    const current = result?.attempt === attempt ? result : null; const rule = current?.rule;
    return <main className="ct-page ct-page--narrow ct-stack"><PageHeader title="Recurring rule details" back={<Link to={`/app/recurring${context}`}>Back to recurring rules</Link>} />
        {(notice || typeof state?.notice === 'string') && <p role="status">{notice || state.notice}</p>}
        {!current ? <LoadingState appearance="clarity" message="Loading recurring rule…" /> : current.error ? <ErrorState appearance="clarity" message={current.error} onRetry={() => setAttempt(attempt + 1)} /> : rule && <SurfaceCard className="ct-stack">
            <h2>{rule.type} · <span className={`ct-amount ct-amount--${rule.type.toLowerCase()}`}>{formatMoney(rule.amount)}</span></h2>
            <p className="whitespace-pre-wrap">Description: {rule.description ?? 'No description'}</p><p>Account: {rule.accountName}</p><div className="ct-category-heading"><CategoryIcon size="small" /><p>Category: {rule.categoryName}</p></div>
            <p>Frequency: {rule.frequency}</p><p>Start: {rule.startDate} · End: {rule.endDate ?? 'No end date'}</p><p>Next due: {rule.nextDueDate ?? 'No next due date'}</p><p>Status: {rule.status}</p>
            {rule.blockedReason && <p>Blocked reason: {rule.blockedReason}</p>}
            <p className="ct-description">Schedule and type are immutable. Historical reference names remain readable. Active status does not confirm scheduler operation.</p>
            {rule.status === 'BLOCKED' && <p className="ct-description">Repair eligible references without changing amount or description. The backend worker rechecks and recovers asynchronously, preserving backlog. Saving repair does not post transactions or promise immediate recovery.</p>}
            {isTerminal(rule.status) && <p className="ct-description">This terminal rule is read-only. Existing generated transactions remain unchanged.</p>}
            <p className="ct-meta ct-description">Created: {rule.createdAt}<br />Updated: {rule.updatedAt}</p>
            {error && <ErrorState appearance="clarity" message={error} />}
            {error && <p className="ct-description">Review the current rule before another explicit attempt; a failed or timed-out request may have completed. No mutation is retried automatically.</p>}
            <div className="ct-actions">
                {!isTerminal(rule.status) && <>
                    {!action && <ButtonLink to={`/app/recurring/${rule.id}/edit${context}`}>{rule.status === 'BLOCKED' ? 'Repair account/category' : 'Edit rule'}</ButtonLink>}
                    <Button hidden={!!action} variant="secondary" onClick={event => { trigger.current = event.currentTarget; setAction(rule.status === 'PAUSED' ? 'Resume' : 'Pause'); }}>{rule.status === 'PAUSED' ? 'Resume rule' : 'Pause rule'}</Button>
                    <Button hidden={!!action} variant="danger" onClick={event => { trigger.current = event.currentTarget; setAction('Cancel'); }}>Cancel rule</Button>
                </>}
                <Button ref={refresh} variant="secondary" disabled={pending || !!action} onClick={() => { setError(''); setNotice(''); setAttempt(attempt + 1); }}>Refresh rule</Button>
                <ButtonLink variant="ghost" to="/app/transactions">View transactions</ButtonLink>
            </div>
            {action && <ConfirmationPanel title={`${action} recurring rule?`} keepLabel="Keep current rule" confirmLabel={pending ? 'Applying…' : `Confirm ${action.toLowerCase()}`} pending={pending} triggerRef={trigger} onCancel={() => setAction(null)} onConfirm={async event => {
                event.preventDefault(); if (pending) return; setPending(true); setError('');
                try {
                    if (action === 'Cancel') { await cancelRecurringTransaction(rule.id); if (mounted.current) navigate(`/app/recurring${context}`, { state: { notice: 'Recurring rule cancelled. Existing transactions remain.' } }); }
                    else { const saved = action === 'Pause' ? await pauseRecurringTransaction(rule.id) : await resumeRecurringTransaction(rule.id);
                        if (mounted.current) { setResult({ attempt, rule: saved }); setAction(null); setNotice(`Server returned status ${saved.status}.`); requestAnimationFrame(() => { if (mounted.current) refresh.current?.focus(); }); }
                    }
                } catch (caught) { if (mounted.current && !axios.isCancel(caught)) setError(normalizeApiError(caught).message); }
                finally { if (mounted.current) setPending(false); }
            }}><p>{explanations[action]}</p></ConfirmationPanel>}
        </SurfaceCard>}
    </main>;
}
export default function RecurringTransactionDetailsPage() {
    const { id = '' } = useParams(); const { search } = useLocation(); let context = ''; let error = '';
    try { context = recurringSearch(recurringQuery(search)); } catch (caught) { error = normalizeApiError(caught).message; }
    return error ? <main className="ct-page"><PageHeader title="Recurring rule details" back={<Link to="/app/recurring">Back to recurring rules</Link>} /><ErrorState appearance="clarity" message={error} /><Link to={`/app/recurring/${id}`}>Clear invalid filters</Link></main>
        : <RuleDetails key={`${id}${search}`} id={id} context={context} />;
}
