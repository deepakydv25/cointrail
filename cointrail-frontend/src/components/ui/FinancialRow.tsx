import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import CategoryIcon from '../CategoryIcon';

export function FinancialRow({ title, to, metadata, amount, type, category, categoryName, trailing }: {
    title: string; to: string; metadata: ReactNode; amount: string; type: 'EXPENSE' | 'INCOME'; category: string; categoryName?: string; trailing?: ReactNode;
}) {
    return <div className="ct-financial-row"><CategoryIcon name={categoryName} type={type} />
        <div className="ct-row-content"><Link to={to} className="ct-row-title">{title}</Link>
            <div className="ct-row-metadata">{metadata}</div><p className="ct-row-metadata">{category}</p></div>
        <div className="ct-row-value"><span className="ct-badge">{type}</span>
            <p className={`ct-amount ct-amount--${type.toLowerCase()}`}>{amount}</p></div>{trailing}
    </div>;
}
