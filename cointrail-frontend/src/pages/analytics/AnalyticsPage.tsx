import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { normalizeApiError } from '../../api/errors';
import { formatMoney } from '../../api/financial';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { FormError } from '../../components/ui/FormFeedback';
import { Icon } from '../../components/ui/Icon';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { getAccountBreakdown, getAnalyticsComparison, getAnalyticsSummary, getAnalyticsTrends, getCategoryBreakdown } from '../../services/analyticsService';
import { analyticsGroupings } from '../../types/analytics';
import type { AnalyticsGrouping, AnalyticsQuery, AnalyticsTotals } from '../../types/analytics';
import { monthRange } from '../dashboard/period';
import { useCurrentCalendarPeriod } from '../dashboard/useCurrentCalendarPeriod';
import { analyticsQuery, analyticsSearch, transactionLink } from './query';
import AnalyticsTrendChart from './AnalyticsTrendChart';
import CategoryBreakdown from './CategoryBreakdown';

type Pending = (name: string, pending: boolean) => void;
// Reports retain their independent request lifecycle so one failed endpoint never hides the others.
function Report<T>({ name, load, attempt, onPending, children }: { name: string; load: (signal: AbortSignal) => Promise<T>; attempt: number; onPending: Pending; children: (data: T) => ReactNode }) {
    const [retry, setRetry] = useState(0);
    const key = `${attempt}/${retry}`;
    const [result, setResult] = useState<{ load: typeof load; key: string; data?: T; error?: string } | null>(null);
    useEffect(() => {
        const controller = new AbortController(); onPending(name, true);
        load(controller.signal).then(data => { if (!controller.signal.aborted) setResult({ load, key, data }); })
            .catch(error => { if (!controller.signal.aborted && !axios.isCancel(error)) setResult({ load, key, error: normalizeApiError(error).message }); })
            .finally(() => { if (!controller.signal.aborted) onPending(name, false); });
        return () => { controller.abort(); onPending(name, false); };
    }, [load, key, name, onPending]);
    const current = result?.load === load && result.key === key ? result : null;
    const pending = !current;
    return <section aria-label={name} aria-busy={pending}>
        <h2>{name}</h2>
        {current?.error ? <ErrorState appearance="clarity" message={current.error} onRetry={() => setRetry(value => value + 1)} /> : current?.data ? children(current.data) : <LoadingState appearance="clarity" message={`Loading ${name.toLowerCase()}…`} />}
    </section>;
}
function Overview({ query, attempt, onPending }: { query: AnalyticsQuery; attempt: number; onPending: Pending }) {
    const { from, to } = query;
    const load = useCallback((signal: AbortSignal) => getAnalyticsSummary({ from, to }, signal), [from, to]);
    return <Report name="Overview" load={load} attempt={attempt} onPending={onPending}>{report => <>
        <div className="ct-analytics-metrics">
            <MetricCard label="Income" tone="income" value={formatMoney(report.totals.income)} />
            <MetricCard label="Expenses" tone="expense" value={formatMoney(report.totals.expense)} />
            <MetricCard label="Net cash flow" value={formatMoney(report.totals.netCashFlow)} />
            <MetricCard label="Transactions" value={report.totals.transactionCount} />
        </div>
        {report.totals.transactionCount === '0' && <p>No recorded transactions in this period.</p>}
        <nav className="ct-analytics-drilldown" aria-label="Transaction reports"><Link to={transactionLink(report.range, { type: 'INCOME' })}>Income transactions</Link><Link to={transactionLink(report.range, { type: 'EXPENSE' })}>Expense transactions</Link></nav>
    </>}</Report>;
}
function Trends({ query, attempt, onPending }: { query: AnalyticsQuery; attempt: number; onPending: Pending }) {
    const { from, to, grouping } = query;
    const load = useCallback((signal: AbortSignal) => getAnalyticsTrends({ from, to }, grouping, signal), [from, to, grouping]);
    return <SurfaceCard><Report name="Income vs expenses" load={load} attempt={attempt} onPending={onPending}>{report => <AnalyticsTrendChart report={report} />}</Report></SurfaceCard>;
}
function Categories({ query, attempt, onPending }: { query: AnalyticsQuery; attempt: number; onPending: Pending }) {
    const { from, to } = query;
    const load = useCallback((signal: AbortSignal) => getCategoryBreakdown({ from, to }, signal), [from, to]);
    return <SurfaceCard><Report name="Spending by category" load={load} attempt={attempt} onPending={onPending}>{report => <CategoryBreakdown report={report} />}</Report></SurfaceCard>;
}
function Accounts({ query, attempt, onPending }: { query: AnalyticsQuery; attempt: number; onPending: Pending }) {
    const { from, to } = query;
    const load = useCallback((signal: AbortSignal) => getAccountBreakdown({ from, to }, signal), [from, to]);
    return <SurfaceCard><Report name="Account activity" load={load} attempt={attempt} onPending={onPending}>{report => report.items.length === 0 ? <EmptyState appearance="clarity" title="No account activity">No recorded transactions in this period.</EmptyState> :
        <ul className="ct-analytics-account-list">{report.items.map(item => <li key={item.accountId}>
            <div className="ct-analytics-account-heading"><Link className="ct-row-title" to={transactionLink(report.range, { accountId: item.accountId })}>{item.accountName}</Link>{!item.active && <span className="ct-status">Inactive</span>}</div>
            <ExactTotals totals={item.totals} compact />
        </li>)}</ul>}
    </Report></SurfaceCard>;
}
function ExactTotals({ totals, delta = false, compact = false }: { totals: AnalyticsTotals; delta?: boolean; compact?: boolean }) {
    const sign = (value: string) => delta && !value.startsWith('-') && /[1-9]/.test(value) ? '+' : '';
    return <dl className={`ct-analytics-totals${compact ? ' ct-analytics-totals--compact' : ''}`}>
        <div><dt>Income</dt><dd className="ct-amount ct-amount--income">{sign(totals.income)}{formatMoney(totals.income)}</dd></div>
        <div><dt>Expenses</dt><dd className="ct-amount ct-amount--expense">{sign(totals.expense)}{formatMoney(totals.expense)}</dd></div>
        <div><dt>Net cash flow</dt><dd className="ct-amount">{sign(totals.netCashFlow)}{formatMoney(totals.netCashFlow)}</dd></div>
        {!compact && <div><dt>Transactions</dt><dd>{sign(totals.transactionCount)}{totals.transactionCount}</dd></div>}
    </dl>;
}
function Comparison({ query, attempt, onPending }: { query: AnalyticsQuery; attempt: number; onPending: Pending }) {
    const { from, to, compareFrom, compareTo } = query;
    const load = useCallback((signal: AbortSignal) => getAnalyticsComparison({ from, to }, { from: compareFrom!, to: compareTo! }, signal), [from, to, compareFrom, compareTo]);
    return <SurfaceCard><Report name="Period comparison" load={load} attempt={attempt} onPending={onPending}>{report => <>
        {report.current.range.dayCount !== report.baseline.range.dayCount && <p className="ct-description">Periods have different lengths; totals are not adjusted per day.</p>}
        {report.current.range.from <= report.baseline.range.to && report.baseline.range.from <= report.current.range.to && <p className="ct-description">These date ranges overlap, so some transactions may appear in both.</p>}
        <div className="ct-analytics-comparison">
            <div><h3>Current</h3><p>{report.current.range.from} – {report.current.range.to}</p><ExactTotals totals={report.current.totals} /></div>
            <div><h3>Comparison</h3><p>{report.baseline.range.from} – {report.baseline.range.to}</p><ExactTotals totals={report.baseline.totals} /></div>
            <div><h3>Delta</h3><p>Current minus comparison</p><ExactTotals totals={report.delta} delta /></div>
        </div>
    </>}</Report></SurfaceCard>;
}
function RangeForm({ search, query }: { search: string; query?: AnalyticsQuery }) {
    const navigate = useNavigate(); const form = useRef<HTMLFormElement>(null);
    const params = new URLSearchParams(search);
    const [draft, setDraft] = useState({ from: query?.from ?? params.get('from') ?? '', to: query?.to ?? params.get('to') ?? '', grouping: query?.grouping ?? params.get('grouping') ?? 'DAILY', compareFrom: query?.compareFrom ?? params.get('compareFrom') ?? '', compareTo: query?.compareTo ?? params.get('compareTo') ?? '' });
    const [comparison, setComparison] = useState(params.has('compareFrom') || params.has('compareTo'));
    const [error, setError] = useState<ReturnType<typeof normalizeApiError> | null>(null);
    function apply() {
        try {
            const next = analyticsSearch({ from: draft.from, to: draft.to, grouping: draft.grouping as AnalyticsGrouping, ...(comparison ? { compareFrom: draft.compareFrom, compareTo: draft.compareTo } : {}) });
            setError(null); navigate(`?${next}`);
        } catch (cause) {
            setError(normalizeApiError(cause)); requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
        }
    }
    const dateField = (key: 'from' | 'to' | 'compareFrom' | 'compareTo', label: string) => <FormField id={key} label={label} error={error?.fieldErrors[key]}>{props =>
        <input {...props} className="ct-control" type="date" min="0001-01-01" max="9999-12-31" value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />}</FormField>;
    return <SurfaceCard><form ref={form} className="ct-reporting-form" noValidate onSubmit={event => { event.preventDefault(); apply(); }}>
        <div className="ct-analytics-controls">{dateField('from', 'From date')}{dateField('to', 'To date')}
            <FormField id="grouping" label="Grouping" error={error?.fieldErrors.grouping}>{props =>
                <select {...props} className="ct-control" value={draft.grouping} onChange={event => setDraft({ ...draft, grouping: event.target.value })}>{analyticsGroupings.map(value => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}{!analyticsGroupings.includes(draft.grouping as AnalyticsGrouping) && <option value={draft.grouping}>Invalid grouping</option>}</select>}</FormField>
        </div>
        {comparison && <fieldset><legend>Compare with</legend><div className="ct-analytics-controls">{dateField('compareFrom', 'Comparison from')}{dateField('compareTo', 'Comparison to')}</div></fieldset>}
        <details className="ct-reporting-limits"><summary>Reporting limits</summary><div>
            <p>Dates are inclusive. Trends support daily, weekly or monthly grouping.</p>
            <p>Daily trends allow up to 366 days; weekly ranges are under 2 years; monthly ranges are under 5 years. Future ranges show recorded actuals only.</p>
        </div></details>
        <FormError error={error} fields={['from', 'to', 'grouping', 'compareFrom', 'compareTo']} appearance="clarity" />
        <div className="ct-analytics-filter-footer">{comparison ? <Button variant="ghost" onClick={() => {
            setComparison(false); setError(null);
            if (query?.compareFrom !== undefined) navigate(`?${analyticsSearch({ from: query.from, to: query.to, grouping: query.grouping })}`);
        }}>Remove comparison</Button> : <Button variant="ghost" onClick={() => setComparison(true)}>Compare</Button>}<Button type="submit">Apply filters</Button></div>
    </form></SurfaceCard>;
}
export default function AnalyticsPage() {
    const { search } = useLocation(); const navigate = useNavigate();
    const calendar = useCurrentCalendarPeriod(true);
    let query: AnalyticsQuery | undefined; let error: string | undefined;
    try { query = analyticsQuery(search); } catch (cause) { error = normalizeApiError(cause).message; }
    const monthValue = query?.from.slice(0, 7) ?? `${calendar.period.year.padStart(4, '0')}-${calendar.period.month.padStart(2, '0')}`;
    // A bare route remains bare. Only deliberate filter edits commit reporting details into the URL.
    const [filterOpen, setFilterOpen] = useState(false);
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const reconcile = () => { clearTimeout(timer); timer = setTimeout(() => setRevision(value => value + 1), 0); };
        window.addEventListener('popstate', reconcile);
        return () => { clearTimeout(timer); window.removeEventListener('popstate', reconcile); };
    }, []);
    const [attempt, setAttempt] = useState(0); const [pending, setPending] = useState<Record<string, boolean>>({});
    const onPending = useCallback<Pending>((name, value) => setPending(previous => previous[name] === value ? previous : { ...previous, [name]: value }), []);
    function changeMonth(value: string) {
        if (!/^\d{4}-\d{2}$/.test(value)) return;
        const [year, month] = value.split('-');
        try {
            const range = monthRange({ year, month });
            const next = analyticsSearch({ ...range, grouping: query?.grouping ?? 'DAILY' });
            navigate(`?${next}`);
        } catch { /* The native month picker cannot select an invalid month. */ }
    }
    return <main className="ct-page ct-analytics">
        <PageHeader title="Analytics" actions={<div className="ct-analytics-header-actions">
            <div className="ct-analytics-month"><label className="sr-only" htmlFor="analytics-month">Select month</label><input id="analytics-month" aria-label="Select month" className="ct-control" type="month" value={monthValue} onChange={event => changeMonth(event.target.value)} /></div>
            <Button className="ct-analytics-filter-toggle" variant="ghost" size="icon" aria-label="Filters" aria-expanded={filterOpen} aria-controls="analytics-filters" title="Filters" onClick={() => setFilterOpen(value => !value)}><Icon name="filter" /></Button>
            <Button variant="ghost" size="icon" aria-label="Refresh all reports" title="Refresh all reports" pending={Object.values(pending).some(Boolean)} onClick={() => setAttempt(value => value + 1)}><Icon name="refresh" className={Object.values(pending).some(Boolean) ? 'ct-refresh-spinning' : ''} /></Button>
        </div>} />
        {filterOpen && <div id="analytics-filters" className="ct-analytics-filter-panel"><RangeForm key={`${search}/${revision}`} search={search} query={query} /></div>}
        {error ? <ErrorState appearance="clarity" message={error} /> : query && <>
            <Overview query={query} attempt={attempt} onPending={onPending} />
            <Trends query={query} attempt={attempt} onPending={onPending} />
            <Categories query={query} attempt={attempt} onPending={onPending} />
            <Accounts query={query} attempt={attempt} onPending={onPending} />
            {query.compareFrom !== undefined && <Comparison query={query} attempt={attempt} onPending={onPending} />}
        </>}
    </main>;
}
