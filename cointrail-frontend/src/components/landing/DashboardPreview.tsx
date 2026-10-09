import CategoryIcon from '../CategoryIcon';
import { MetricCard } from '../ui/MetricCard';
import { SurfaceCard } from '../ui/SurfaceCard';

// Display-only examples. Never share these with authenticated financial reports.
export default function DashboardPreview() {
    return <figure className="ct-landing-preview" aria-labelledby="preview-caption">
        <figcaption id="preview-caption">Illustrative Dashboard V2 preview · Example data, not a live account.</figcaption>
        <div className="ct-landing-preview-heading"><p>Dashboard V2</p><p>Reporting month: September 2026</p></div>
        <div className="ct-landing-preview-metrics">
            <MetricCard label="Total active-account balance" value="₹42,500.00" explanation="All recorded dates · active accounts" />
            <MetricCard label="Monthly income" value="₹35,000.00" tone="income" explanation="September 2026" />
            <MetricCard label="Monthly expenses" value="₹12,500.00" tone="expense" explanation="September 2026" />
            <MetricCard label="Monthly net cash flow" value="₹22,500.00" explanation="September 2026 · Income minus expense" />
        </div>
        <div className="ct-landing-preview-grid">
            <SurfaceCard><h3>Monthly income and expense</h3><dl className="ct-landing-preview-bars"><div><dt>Income</dt><dd className="ct-amount ct-amount--income">₹35,000.00</dd><span className="ct-landing-bar ct-landing-bar--income" aria-hidden="true" /></div><div><dt>Expenses</dt><dd className="ct-amount ct-amount--expense">₹12,500.00</dd><span className="ct-landing-bar ct-landing-bar--expense" aria-hidden="true" /></div></dl></SurfaceCard>
            <SurfaceCard><h3>Category spending</h3><ul className="ct-landing-preview-list">{[['Groceries', '₹4,500.00'], ['Transport', '₹2,000.00'], ['Other', '₹6,000.00']].map(([name, amount]) => <li key={name}><CategoryIcon size="small" /><span>{name}</span><span className="ct-amount ct-amount--expense">{amount}</span></li>)}</ul></SurfaceCard>
            <SurfaceCard className="ct-landing-preview-recent"><h3>Recent V2 transactions</h3><p className="ct-description">Across recorded dates</p><ul className="ct-landing-preview-list">{[['Salary', 'INCOME', '₹35,000.00'], ['Groceries', 'EXPENSE', '₹1,200.00']].map(([name, type, amount]) => <li key={name}><CategoryIcon size="small" /><span>{name}<span className="ct-landing-preview-type">{type}</span></span><span className={`ct-amount ct-amount--${type.toLowerCase()}`}>{amount}</span></li>)}</ul></SurfaceCard>
        </div>
    </figure>;
}
