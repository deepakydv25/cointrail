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
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { getAccountBreakdown, getAnalyticsComparison, getAnalyticsSummary, getAnalyticsTrends, getCategoryBreakdown } from '../../services/analyticsService';
import { analyticsGroupings } from '../../types/analytics';
import type { AnalyticsGrouping, AnalyticsQuery, AnalyticsTotals } from '../../types/analytics';
import { analyticsQuery, analyticsSearch, transactionLink } from './query';
import AnalyticsTrendChart from './AnalyticsTrendChart';
import CategoryBreakdown from './CategoryBreakdown';

type Pending = (name: string, pending: boolean) => void;
// Domain-local read lifecycle shared by the five independently retryable reports.
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
        <div className="ct-actions"><h2>{name}</h2><Button variant="ghost" disabled={pending} onClick={() => setRetry(retry + 1)}>Refresh {name.toLowerCase()}</Button></div>
        {current?.error ? <ErrorState appearance="clarity" message={current.error} onRetry={() => setRetry(retry + 1)} /> : current?.data ? children(current.data) : <LoadingState appearance="clarity" message={`Loading ${name.toLowerCase()}…`} />}
    </section>;
}
function Overview({ query, attempt, onPending }: { query: AnalyticsQuery; attempt: number; onPending: Pending }) {
    const { from, to } = query;
    const load = useCallback((signal: AbortSignal) => getAnalyticsSummary({ from, to }, signal), [from, to]);
    return <Report name="Overview" load={load} attempt={attempt} onPending={onPending}>{report => <>
        <p className="ct-description">{report.range.from} through {report.range.to} · {report.range.dayCount} inclusive days. Recorded V2 activity; no opening balances.</p>
        <div className="ct-dashboard-metrics">
            <MetricCard label="Income" tone="income" value={formatMoney(report.totals.income)} />
            <MetricCard label="Expenses" tone="expense" value={formatMoney(report.totals.expense)} />
            <MetricCard label="Net cash flow" value={formatMoney(report.totals.netCashFlow)} explanation="Income minus expense" />
            <MetricCard label="Transactions" value={report.totals.transactionCount} />
        </div>
        {report.totals.transactionCount === '0' && <p>No recorded transactions in this range.</p>}
        <div className="ct-actions"><Link className="ct-button ct-button--ghost" to={transactionLink(report.range, { type: 'INCOME' })}>View income transactions</Link><Link className="ct-button ct-button--ghost" to={transactionLink(report.range, { type: 'EXPENSE' })}>View expense transactions</Link></div>
    </>}</Report>;
}
function Trends({ query, attempt, onPending }: { query: AnalyticsQuery; attempt: number; onPending: Pending }) {
    const { from, to, grouping } = query;
    const load = useCallback((signal: AbortSignal) => getAnalyticsTrends({ from, to }, grouping, signal), [from, to, grouping]);
    return <SurfaceCard><Report name="Income vs expense trend" load={load} attempt={attempt} onPending={onPending}>{report => <AnalyticsTrendChart report={report} />}</Report></SurfaceCard>;
}
function Categories({ query, attempt, onPending }: { query: AnalyticsQuery; attempt: number; onPending: Pending }) {
    const { from, to } = query;
    const load = useCallback((signal: AbortSignal) => getCategoryBreakdown({ from, to }, signal), [from, to]);
    return <SurfaceCard><Report name="Category activity" load={load} attempt={attempt} onPending={onPending}>{report => <CategoryBreakdown report={report} />}</Report></SurfaceCard>;
}
function Accounts({ query, attempt, onPending }: { query: AnalyticsQuery; attempt: number; onPending: Pending }) {
    const { from, to } = query;
    const load = useCallback((signal: AbortSignal) => getAccountBreakdown({ from, to }, signal), [from, to]);
    return <SurfaceCard><Report name="Account activity" load={load} attempt={attempt} onPending={onPending}>{report => <>
        <p className="ct-description">{report.range.from} through {report.range.to}. Transaction activity, not account balances. Current names and inactive history; account ID order.</p>
        {report.items.length === 0 ? <EmptyState appearance="clarity" title="No account activity">No recorded V2 transactions in the selected range.</EmptyState> :
            <ul className="ct-financial-list">{report.items.map(item => <li key={item.accountId}>
                <Link className="ct-row-title" to={transactionLink(report.range, { accountId: item.accountId })}>{item.accountName}</Link>
                <p className="ct-description">{item.accountType} · {item.active ? 'Active' : 'Inactive'} · ID {item.accountId}</p>
                <ExactTotals totals={item.totals} />
            </li>)}</ul>}
    </>}</Report></SurfaceCard>;
}
function ExactTotals({ totals, delta = false }: { totals: AnalyticsTotals; delta?: boolean }) {
    const sign = (value: string) => delta && !value.startsWith('-') && /[1-9]/.test(value) ? '+' : '';
    return <dl className="ct-dashboard-values">
        <div><dt>Income</dt><dd className={`ct-amount ${delta ? '' : 'ct-amount--income'}`}>{sign(totals.income)}{formatMoney(totals.income)}</dd></div>
        <div><dt>Expense</dt><dd className={`ct-amount ${delta ? '' : 'ct-amount--expense'}`}>{sign(totals.expense)}{formatMoney(totals.expense)}</dd></div>
        <div><dt>Net cash flow</dt><dd className="ct-amount">{sign(totals.netCashFlow)}{formatMoney(totals.netCashFlow)}</dd></div>
        <div><dt>Transactions</dt><dd>{sign(totals.transactionCount)}{totals.transactionCount}</dd></div>
    </dl>;
}
function Comparison({ query, attempt, onPending }: { query: AnalyticsQuery; attempt: number; onPending: Pending }) {
    const { from, to, compareFrom, compareTo } = query;
    const load = useCallback((signal: AbortSignal) => getAnalyticsComparison({ from, to }, { from: compareFrom!, to: compareTo! }, signal), [from, to, compareFrom, compareTo]);
    return <SurfaceCard><Report name="Period comparison" load={load} attempt={attempt} onPending={onPending}>{report => <>
        <p className="ct-description">Raw current-minus-comparison deltas. No percentages or duration normalization.</p>
        {report.current.range.dayCount !== report.baseline.range.dayCount && <p>These periods have unequal durations; raw totals are not adjusted per day.</p>}
        {report.current.range.from <= report.baseline.range.to && report.baseline.range.from <= report.current.range.to && <p>These periods overlap; some transactions can appear in both periods.</p>}
        <div className="ct-analytics-comparison">
            <div><h3>Current</h3><p>{report.current.range.from} through {report.current.range.to} · {report.current.range.dayCount} days</p><ExactTotals totals={report.current.totals} /></div>
            <div><h3>Comparison</h3><p>{report.baseline.range.from} through {report.baseline.range.to} · {report.baseline.range.dayCount} days</p><ExactTotals totals={report.baseline.totals} /></div>
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
    return <SurfaceCard><form ref={form} noValidate onSubmit={event => { event.preventDefault(); apply(); }}>
        <div className="ct-analytics-controls">{dateField('from', 'From')}{dateField('to', 'To')}
            <FormField id="grouping" label="Trend grouping" error={error?.fieldErrors.grouping} hint="DAILY: 366 days. WEEKLY: before 2-year anniversary. MONTHLY: before 5-year anniversary.">{props =>
                <select {...props} className="ct-control" value={draft.grouping} onChange={event => setDraft({ ...draft, grouping: event.target.value })}>{analyticsGroupings.map(value => <option key={value}>{value}</option>)}{!analyticsGroupings.includes(draft.grouping as AnalyticsGrouping) && <option value={draft.grouping}>Invalid grouping</option>}</select>}</FormField>
        </div>
        <p className="ct-description">Inclusive dates, years 0001–9999. All reports must end before the 5-year calendar anniversary. Future ranges show recorded actuals only.</p>
        {comparison && <fieldset><legend>Explicit comparison period</legend><div className="ct-analytics-controls">{dateField('compareFrom', 'Comparison from')}{dateField('compareTo', 'Comparison to')}</div></fieldset>}
        <FormError error={error} fields={['from', 'to', 'grouping', 'compareFrom', 'compareTo']} appearance="clarity" />
        <div className="ct-actions"><Button type="submit">Apply range</Button>{comparison ? <Button variant="secondary" onClick={() => {
            setComparison(false); setError(null);
            if (query?.compareFrom !== undefined) navigate(`?${analyticsSearch({ from: query.from, to: query.to, grouping: query.grouping })}`);
        }}>Remove comparison</Button> : <Button variant="secondary" onClick={() => setComparison(true)}>Add comparison</Button>}</div>
    </form></SurfaceCard>;
}
export default function AnalyticsPage() {
    const { search } = useLocation(); const navigate = useNavigate();
    let query: AnalyticsQuery | undefined; let error: string | undefined;
    try { query = analyticsQuery(search); } catch (cause) { error = normalizeApiError(cause).message; }
    const canonical = query ? analyticsSearch(query) : undefined;
    useEffect(() => { if (canonical && search !== `?${canonical}`) navigate(`?${canonical}`, { replace: true }); }, [canonical, search, navigate]);
    // Browsers may restore native form values after popstate; reconcile drafts to the committed URL afterwards.
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const reconcile = () => { clearTimeout(timer); timer = setTimeout(() => setRevision(value => value + 1), 0); };
        window.addEventListener('popstate', reconcile);
        return () => { clearTimeout(timer); window.removeEventListener('popstate', reconcile); };
    }, []);
    const [attempt, setAttempt] = useState(0); const [pending, setPending] = useState<Record<string, boolean>>({});
    const onPending = useCallback<Pending>((name, value) => setPending(previous => previous[name] === value ? previous : { ...previous, [name]: value }), []);
    return <main className="ct-page ct-analytics">
        <PageHeader title="Analytics" description="Recorded V2 income and expenses. Legacy expenses, opening balances and unposted recurring rules are excluded." />
        <RangeForm key={`${search}/${revision}`} search={search} query={query} />
        {error ? <ErrorState appearance="clarity" message={error} /> : query && <>
            <div className="ct-actions"><p className="ct-description">Reporting {query.from} through {query.to}. Reports may briefly differ during concurrent changes; refresh is not a synchronized snapshot.</p>
                <Button variant="secondary" disabled={Object.values(pending).some(Boolean)} onClick={() => setAttempt(attempt + 1)}>Refresh all reports</Button></div>
            <Overview query={query} attempt={attempt} onPending={onPending} />
            <Trends query={query} attempt={attempt} onPending={onPending} />
            <Categories query={query} attempt={attempt} onPending={onPending} />
            <Accounts query={query} attempt={attempt} onPending={onPending} />
            {query.compareFrom !== undefined && <Comparison query={query} attempt={attempt} onPending={onPending} />}
        </>}
    </main>;
}
