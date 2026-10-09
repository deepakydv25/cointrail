import { formatMoney } from '../../api/financial';
import type { BudgetResponse } from '../../types/budget';

export function BudgetValues({ budget }: { budget: BudgetResponse }) {
    return <><dl className="ct-budget-values">
        <div><dt>Budget limit</dt><dd className="ct-amount">{formatMoney(budget.amount)}</dd></div>
        <div><dt>Spent</dt><dd className="ct-amount ct-amount--expense">{formatMoney(budget.spentAmount)}</dd></div>
        <div><dt>Remaining</dt><dd className={`ct-amount ${budget.remainingAmount.startsWith('-') ? 'ct-amount--expense' : ''}`}>{formatMoney(budget.remainingAmount)}</dd></div>
    </dl><p className={budget.overBudget ? 'ct-field-error' : 'ct-description'}>{budget.overBudget ? 'Over budget' : 'Within budget'}</p></>;
}
