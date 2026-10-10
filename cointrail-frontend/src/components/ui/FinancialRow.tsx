import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import CategoryIcon from '../CategoryIcon';

export function FinancialRow({ title, to, metadata, amount, type, category, categoryName, trailing, compact = false }: {
    title: string; to: string; metadata: ReactNode; amount: string; type: 'EXPENSE' | 'INCOME'; category: string; categoryName?: string; trailing?: ReactNode; compact?: boolean;
}) {
    return <div className={`ct-financial-row${compact ? ' ct-financial-row--compact' : ''}`}><CategoryIcon name={categoryName} type={type} size={compact ? 'small' : 'normal'} />
        <div className="ct-row-content"><Link to={to} className="ct-row-title">{title}</Link>
            <div className="ct-row-metadata">{compact ? <>{category}<span aria-hidden="true">{' \u00b7 '}</span>{metadata}</> : metadata}</div>{!compact && <p className="ct-row-metadata">{category}</p>}</div>
        <div className="ct-row-value"><span className={compact ? 'sr-only' : 'ct-badge'}>{type}</span>
            <p className={`ct-amount ct-amount--${type.toLowerCase()}`}>{amount}</p></div>{trailing}
    </div>;
}
