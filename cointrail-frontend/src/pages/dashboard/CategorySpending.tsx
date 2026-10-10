import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { getCategoryBreakdown } from '../../services/analyticsService';
import type { CategoriesResponse } from '../../types/analytics';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import CategoryIcon from '../../components/CategoryIcon';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { AmountChart } from './IncomeExpenseChart';

export default function CategorySpending({ from, to, label, attempt, onRetry }: {
    from: string; to: string; label: string; attempt: number; onRetry: () => void;
}) {
    const key = `${from}/${to}/${attempt}`;
    const [result, setResult] = useState<{ key: string; data?: CategoriesResponse; error?: string } | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        getCategoryBreakdown({ from, to }, controller.signal).then(data => {
            if (!controller.signal.aborted) setResult({ key, data });
        }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setResult({ key, error: normalizeApiError(error).message });
        });
        return () => controller.abort();
    }, [from, to, key]);
    const current = result?.key === key ? result : null;
    const groups = current?.data?.items.filter(item => item.categoryType === 'EXPENSE') ?? [];
    return <SurfaceCard className="ct-dashboard-categories"><section aria-labelledby="category-spending-heading">
        <h2 id="category-spending-heading">Spending by category</h2><p className="ct-description">{label} · Expense transactions for this month, including inactive categories.</p>
        {current?.error ? <ErrorState appearance="clarity" message={current.error} onRetry={onRetry} />
            : !current?.data ? <LoadingState appearance="clarity" message="Loading category spending…" />
                : groups.length === 0 ? <EmptyState appearance="clarity" title="No category spending">No expense-category spending in this month.</EmptyState> : <>
                    <p className="ct-description">Relative amounts. All categories and exact values are listed below.</p>
                    {groups.length <= 12 ? <AmountChart items={groups.map((group, index) => ({ id: group.categoryId, label: String(index + 1), tooltipLabel: group.categoryName, amount: group.totals.expense, tone: 'expense' }))} />
                        : <p className="ct-description">Chart omitted for this larger category set; the complete list follows.</p>}
                    <ol className="ct-financial-list" aria-label={`Expense categories for ${label}`}>{groups.map((group, index) =>
                        <li key={group.categoryId}><div className="ct-financial-row"><CategoryIcon name={group.categoryName} type={group.categoryType} system={group.system} />
                            <div className="ct-row-content"><Link className="ct-row-title" to={`/app/transactions?${new URLSearchParams({ type: 'EXPENSE', categoryId: group.categoryId, from, to, page: '0' })}`}>
                                {index + 1}. {group.categoryName}</Link>
                                <p className="ct-row-metadata">{group.system ? 'System' : 'Custom'}{!group.active && ' · Inactive category'}</p></div>
                            <p className="ct-amount ct-amount--expense">{formatMoney(group.totals.expense)}</p></div></li>)}</ol>
                </>}
    </section></SurfaceCard>;
}
