import { ApiError } from '../../api/errors';
import { isDate } from '../transactions/query';
import { currentPeriod, monthRange } from '../dashboard/period';
import { analyticsGroupings } from '../../types/analytics';
import type { AnalyticsGrouping, AnalyticsQuery, ReportingRange } from '../../types/analytics';

const leap = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
// Calendar integers only; no monetary values or Long identifiers are converted.
function ordinal(date: string): number {
    const [year, month, day] = date.split('-').map(Number);
    const previous = year - 1;
    const lengths = [31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return previous * 365 + Math.floor(previous / 4) - Math.floor(previous / 100) + Math.floor(previous / 400) +
        lengths.slice(0, month - 1).reduce((sum, days) => sum + days, 0) + day;
}
export function inclusiveDays(range: ReportingRange): number { return ordinal(range.to) - ordinal(range.from) + 1; }
export function validateRange(range: ReportingRange, grouping?: AnalyticsGrouping): ReportingRange {
    const errors: Record<string, string> = {};
    if (!isDate(range.from)) errors.from = 'Choose a real date within years 0001–9999.';
    if (!isDate(range.to)) errors.to = 'Choose a real date within years 0001–9999.';
    if (!Object.keys(errors).length && range.from > range.to) errors.to = 'End must be on or after start.';
    if (Object.keys(errors).length) throw new ApiError('Check your reporting dates.', 'validation', 400, errors);
    if (grouping !== undefined && !analyticsGroupings.includes(grouping)) throw new ApiError('Choose DAILY, WEEKLY or MONTHLY.', 'validation', 400, { grouping: 'Choose a supported grouping.' });
    if (grouping === 'DAILY') {
        if (inclusiveDays(range) > 366) throw new ApiError('DAILY trends allow at most 366 inclusive days.', 'validation', 400, { grouping: 'Use MONTHLY or a shorter range.' });
    } else {
        const years = grouping === 'WEEKLY' ? 2 : 5;
        const [year, month, day] = range.from.split('-').map(Number);
        const anniversaryYear = year + years;
        const anniversaryDay = month === 2 && day === 29 && !leap(anniversaryYear) ? 28 : day;
        // The validation anniversary can exceed year9999; public dates cannot.
        const [endYear, endMonth, endDay] = range.to.split('-').map(Number);
        if (endYear > anniversaryYear || (endYear === anniversaryYear && (endMonth > month || (endMonth === month && endDay >= anniversaryDay))))
            throw new ApiError(`End must be before the ${years}-year calendar anniversary.`, 'validation', 400, { to: `Choose an end before the ${years}-year anniversary.` });
    }
    return { from: range.from, to: range.to };
}
export function validateAnalytics(query: AnalyticsQuery): AnalyticsQuery {
    if (!analyticsGroupings.includes(query.grouping)) throw new ApiError('Choose DAILY, WEEKLY or MONTHLY.', 'validation', 400, { grouping: 'Choose a supported grouping.' });
    validateRange(query); validateRange(query, query.grouping);
    if (query.compareFrom !== undefined || query.compareTo !== undefined) {
        try { validateRange({ from: query.compareFrom ?? '', to: query.compareTo ?? '' }); }
        catch (error) {
            if (!(error instanceof ApiError)) throw error;
            throw new ApiError('Check your comparison dates.', 'validation', 400,
                Object.fromEntries(Object.entries(error.fieldErrors).map(([key, value]) => [key === 'from' ? 'compareFrom' : 'compareTo', value])));
        }
    }
    return query;
}
export function analyticsQuery(search: string, date = new Date()): AnalyticsQuery {
    const params = new URLSearchParams(search);
    const allowed = ['from', 'to', 'grouping', 'compareFrom', 'compareTo'];
    if ([...params.keys()].some(key => !allowed.includes(key) || params.getAll(key).length !== 1))
        throw new ApiError('Supply each supported reporting parameter once.', 'validation', 400);
    const range = params.size === 0 ? monthRange(currentPeriod(date)) : { from: params.get('from') ?? '', to: params.get('to') ?? '' };
    validateRange(range);
    const grouping = params.has('grouping') ? params.get('grouping') as AnalyticsGrouping : inclusiveDays(range) <= 366 ? 'DAILY' : 'MONTHLY';
    if (!analyticsGroupings.includes(grouping)) throw new ApiError('Choose DAILY, WEEKLY or MONTHLY.', 'validation', 400, { grouping: 'Choose a supported grouping.' });
    return validateAnalytics({ ...range, grouping, ...(params.has('compareFrom') || params.has('compareTo') ? { compareFrom: params.get('compareFrom') ?? '', compareTo: params.get('compareTo') ?? '' } : {}) });
}
export function analyticsSearch(query: AnalyticsQuery): string {
    const valid = validateAnalytics(query);
    return new URLSearchParams({ from: valid.from, to: valid.to, grouping: valid.grouping,
        ...(valid.compareFrom !== undefined ? { compareFrom: valid.compareFrom, compareTo: valid.compareTo! } : {}) }).toString();
}
export function transactionLink(range: ReportingRange, filters: { type?: 'INCOME' | 'EXPENSE'; accountId?: string; categoryId?: string } = {}): string {
    return `/app/transactions?${new URLSearchParams({ from: range.from, to: range.to, ...filters, page: '0' })}`;
}
