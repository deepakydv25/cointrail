import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import CategoryIcon from '../../components/CategoryIcon';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ConfirmationPanel } from '../../components/ui/ConfirmationPanel';
import { ErrorState } from '../../components/ui/States';
import { formatMoney } from '../../api/financial';
import { normalizeApiError } from '../../api/errors';
import { deleteBudget } from '../../services/budgetService';
import type { BudgetResponse } from '../../types/budget';
import { BudgetProgress } from './BudgetProgress';

export function BudgetCard({ budget, search, onDeleted }: { budget: BudgetResponse; search: string; onDeleted: () => void }) {
    const [open, setOpen] = useState(false); const [confirm, setConfirm] = useState(false);
    const [pending, setPending] = useState(false); const [error, setError] = useState('');
    const trigger = useRef<HTMLButtonElement>(null); const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    return <SurfaceCard padding="compact" className={`ct-budget-card${budget.overBudget ? ' ct-budget-card--over' : ''}`}>
        <div className="ct-budget-card-heading"><div className="ct-category-heading"><CategoryIcon name={budget.categoryName} type="EXPENSE" size="small" />
            <Link className="ct-row-title" to={`/app/budgets/${budget.id}${search}`}>{budget.categoryName}</Link></div>
            <div className="ct-budget-actions" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
                onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }}>
                <Button ref={trigger} variant="ghost" size="icon" className="ct-budget-icon-action" aria-label={`Actions for ${budget.categoryName}`} title={`Actions for ${budget.categoryName}`}
                    aria-expanded={open} aria-controls={`budget-actions-${budget.id}`} disabled={pending || confirm} onClick={() => setOpen(!open)}><Icon name="more" /></Button>
                {open && <div id={`budget-actions-${budget.id}`} className="ct-budget-action-options">
                    <ButtonLink variant="ghost" to={`/app/budgets/${budget.id}/edit${search}`}>Edit budget</ButtonLink>
                    <Button variant="ghost" onClick={() => { setOpen(false); setConfirm(true); }}>Delete budget</Button>
                </div>}
            </div>
        </div>
        <p className="ct-budget-card-amounts"><span className="ct-amount ct-amount--expense">{formatMoney(budget.spentAmount)}</span><span className="ct-description"> / </span><span className="ct-amount">{formatMoney(budget.amount)}</span></p>
        <BudgetProgress spent={budget.spentAmount} limit={budget.amount} label={budget.categoryName} overBudget={budget.overBudget} />
        <p className={`ct-budget-status${budget.overBudget ? ' ct-field-error' : ' ct-description'}`}>{budget.overBudget ? 'Over budget' : 'Within budget'}</p>
        {error && <ErrorState appearance="clarity" message={error} />}
        {confirm && <ConfirmationPanel title="Delete this budget definition?" keepLabel="Keep budget" confirmLabel={pending ? 'Deleting…' : 'Confirm budget deletion'} pending={pending} triggerRef={trigger}
            onCancel={() => setConfirm(false)} onConfirm={async event => {
                event.preventDefault(); if (pending) return; setPending(true); setError('');
                try { await deleteBudget(budget.id); if (mounted.current) onDeleted(); }
                catch (caught) { if (mounted.current && !axios.isCancel(caught)) setError(normalizeApiError(caught).message); }
                finally { if (mounted.current) setPending(false); }
            }}><p>This permanently removes the monthly budget definition. Existing transactions will remain unchanged.</p></ConfirmationPanel>}
    </SurfaceCard>;
}
