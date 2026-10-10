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
import { minorUnits } from './chartData';

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
    const groups = current?.data?.items.filter(item => item.categoryType === 'EXPENSE' && minorUnits(item.totals.expense) > 0n) ?? [];
    groups.sort((a, b) => { const left = minorUnits(a.totals.expense); const right = minorUnits(b.totals.expense); return left > right ? -1 : left < right ? 1 : 0; });
    const total = groups.reduce((sum, group) => sum + minorUnits(group.totals.expense), 0n);
    return <SurfaceCard className="ct-dashboard-categories ct-dashboard-wide"><section aria-labelledby="category-spending-heading">
        <h2 id="category-spending-heading">Spending Summary</h2><p className="ct-description">{label}</p>
        {current?.error ? <ErrorState appearance="clarity" message={current.error} onRetry={onRetry} />
            : !current?.data ? <LoadingState appearance="clarity" message="Loading category spending…" />
                : groups.length === 0 ? <EmptyState appearance="clarity" title="No category spending">No expense-category spending in this month.</EmptyState> : <>
                    <ol className="ct-financial-list" aria-label={`Expense categories for ${label}`}>{groups.map(group =>
                        <li key={group.categoryId}><div className="ct-financial-row"><CategoryIcon name={group.categoryName} type={group.categoryType} system={group.system} />
                            <div className="ct-row-content"><Link className="ct-row-title" to={`/app/transactions?${new URLSearchParams({ type: 'EXPENSE', categoryId: group.categoryId, from, to, page: '0' })}`}>
                                {group.categoryName}</Link>
                                <div className="ct-spending-bar" aria-hidden="true"><span style={{ width: `${Number(minorUnits(group.totals.expense) * 10000n / total) / 100}%` }} /></div></div>
                            <div className="ct-row-value"><p className="ct-amount ct-amount--expense">{formatMoney(group.totals.expense)}</p><p className="ct-row-metadata">{(Number(minorUnits(group.totals.expense) * 10000n / total) / 100).toFixed(2)}%</p></div></div></li>)}</ol>
                </>}
    </section></SurfaceCard>;
}
