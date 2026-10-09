import { SurfaceCard } from './SurfaceCard';

export function MetricCard({ label, value, explanation, tone = 'neutral' }: { label: string; value: string; explanation?: string; tone?: 'neutral' | 'income' | 'expense' }) {
    return <SurfaceCard><p className="ct-label">{label}</p><p className={`ct-metric ct-amount ct-amount--${tone}`}>{value}</p>
        {explanation && <p className="ct-description">{explanation}</p>}</SurfaceCard>;
}
