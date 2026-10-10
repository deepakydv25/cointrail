import { useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryIcon from '../../components/CategoryIcon';
import { FormField } from '../../components/ui/FormField';
import { EmptyState } from '../../components/ui/States';
import { formatMoney } from '../../api/financial';
import type { CategoriesResponse } from '../../types/analytics';
import type { TransactionType } from '../../types/transaction';
import { AmountChart } from '../dashboard/IncomeExpenseChart';
import { transactionLink } from './query';

export default function CategoryBreakdown({ report }: { report: CategoriesResponse }) {
    const [type, setType] = useState<TransactionType>('EXPENSE');
    const items = report.items.filter(item => item.categoryType === type);
    return <>
        <FormField id="category-view" label="Category breakdown view" hint="Changes these rows only; overview and trends include all recorded activity.">{props =>
            <select {...props} className="ct-control" value={type} onChange={event => setType(event.target.value as TransactionType)}><option value="EXPENSE">Expense spending</option><option value="INCOME">Income by category</option></select>}</FormField>
        <p className="ct-description">{report.range.from} through {report.range.to}. Current category names, including inactive history. Complete groups in category ID order.</p>
        {items.length === 0 ? <EmptyState appearance="clarity" title={`No ${type.toLowerCase()} category activity`}>No recorded transactions of this type in the selected range.</EmptyState> : <>
            <p className="ct-description">Relative amounts; tiny amounts may be invisible. Exact values below.</p>
            <AmountChart items={items.map(item => ({ id: item.categoryId, label: item.categoryName, tooltipLabel: `${item.categoryName} · ID ${item.categoryId}`, amount: type === 'EXPENSE' ? item.totals.expense : item.totals.income, tone: type === 'EXPENSE' ? 'expense' : 'income' }))} />
            <ul className="ct-financial-list">{items.map(item => <li key={item.categoryId} className="ct-analytics-category">
                <CategoryIcon name={item.categoryName} type={item.categoryType} system={item.system} /><div><Link className="ct-row-title" to={transactionLink(report.range, { categoryId: item.categoryId, type })}>{item.categoryName}</Link>
                    <p className="ct-description">{item.categoryType} · {item.system ? 'System' : 'Custom'} · {item.active ? 'Active' : 'Inactive'} · ID {item.categoryId}</p>
                    <dl className="ct-dashboard-values"><div><dt>{type === 'EXPENSE' ? 'Expense' : 'Income'}</dt><dd className={`ct-amount ct-amount--${type === 'EXPENSE' ? 'expense' : 'income'}`}>{formatMoney(type === 'EXPENSE' ? item.totals.expense : item.totals.income)}</dd></div>
                        <div><dt>Transactions</dt><dd>{item.totals.transactionCount}</dd></div></dl>
                </div></li>)}</ul>
        </>}
    </>;
}
