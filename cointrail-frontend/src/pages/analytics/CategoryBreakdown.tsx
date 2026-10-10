import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryIcon from '../../components/CategoryIcon';
import { FormField } from '../../components/ui/FormField';
import { EmptyState } from '../../components/ui/States';
import { formatMoney } from '../../api/financial';
import type { CategoriesResponse } from '../../types/analytics';
import type { TransactionType } from '../../types/transaction';
import { minorUnits } from '../dashboard/chartData';
import { transactionLink } from './query';

export default function CategoryBreakdown({ report }: { report: CategoriesResponse }) {
    const [type, setType] = useState<TransactionType>('EXPENSE');
    const items = useMemo(() => report.items
        .filter(item => item.categoryType === type && minorUnits(type === 'EXPENSE' ? item.totals.expense : item.totals.income) > 0n)
        .sort((a, b) => {
            const left = minorUnits(type === 'EXPENSE' ? a.totals.expense : a.totals.income);
            const right = minorUnits(type === 'EXPENSE' ? b.totals.expense : b.totals.income);
            return left > right ? -1 : left < right ? 1 : 0;
        }), [report.items, type]);
    const total = items.reduce((sum, item) => sum + minorUnits(type === 'EXPENSE' ? item.totals.expense : item.totals.income), 0n);
    return <>
        <FormField id="category-view" label="Show category activity">{props =>
            <select {...props} className="ct-control ct-analytics-category-type" value={type} onChange={event => setType(event.target.value as TransactionType)}><option value="EXPENSE">Spending</option><option value="INCOME">Income</option></select>}</FormField>
        {items.length === 0 ? <EmptyState appearance="clarity" title={`No ${type.toLowerCase()} category activity`}>No recorded activity in this period.</EmptyState> :
            <ul className="ct-analytics-category-list">{items.map(item => {
                const amount = type === 'EXPENSE' ? item.totals.expense : item.totals.income;
                const proportion = total > 0n ? Number((minorUnits(amount) * 10000n) / total) / 100 : 0;
                return <li className="ct-analytics-category-row" key={item.categoryId}>
                    <CategoryIcon name={item.categoryName} type={item.categoryType} system={item.system} />
                    <div className="ct-analytics-category-content"><div className="ct-analytics-category-heading"><Link className="ct-row-title" to={transactionLink(report.range, { categoryId: item.categoryId, type })}>{item.categoryName}</Link><div><span className="ct-analytics-share">{proportion.toFixed(1)}%</span><strong className={`ct-amount ct-amount--${type === 'EXPENSE' ? 'expense' : 'income'}`}>{formatMoney(amount)}</strong></div></div>
                        <div className="ct-analytics-progress" role="progressbar" aria-label={`${item.categoryName} share`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={proportion}><span style={{ width: `${proportion}%`, backgroundColor: type === 'EXPENSE' ? `hsl(217 91% ${55 + (1 - proportion / 100) * 28}%)` : 'var(--ct-income)' }} /></div>
                    </div>
                </li>;
            })}</ul>}
    </>;
}
