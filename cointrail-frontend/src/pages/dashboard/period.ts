import { ApiError } from '../../api/errors';
import type { DashboardPeriod } from '../../types/dashboard';

export const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function validatePeriod(period: DashboardPeriod): DashboardPeriod {
    const errors: Record<string, string> = {};
    if (!/^\d{1,4}$/.test(period.year) || BigInt(period.year) < 1n) errors.year = 'Use a year from 1 to 9999.';
    if (!/^\d{1,2}$/.test(period.month) || BigInt(period.month) < 1n || BigInt(period.month) > 12n) errors.month = 'Choose a month from January to December.';
    if (Object.keys(errors).length) throw new ApiError('Choose a valid reporting month and year.', 'validation', 400, errors);
    return { year: String(BigInt(period.year)), month: String(BigInt(period.month)) };
}
export function currentPeriod(date = new Date()): DashboardPeriod {
    return { year: String(date.getFullYear()), month: String(date.getMonth() + 1) };
}
export function periodFromSearch(search: string): DashboardPeriod | null {
    const params = new URLSearchParams(search);
    if (!params.has('year') && !params.has('month')) return null;
    if (params.getAll('year').length !== 1 || params.getAll('month').length !== 1)
        throw new ApiError('Supply one reporting year and month.', 'validation', 400);
    return validatePeriod({ year: params.get('year') ?? '', month: params.get('month') ?? '' });
}
export function periodSearch(period: DashboardPeriod): string {
    return new URLSearchParams({ ...validatePeriod(period) }).toString();
}
export function monthRange(period: DashboardPeriod): { from: string; to: string } {
    const valid = validatePeriod(period);
    // Calendar integers are safe; monetary values and Long IDs never use Number.
    const year = Number(valid.year); const month = Number(valid.month);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    const prefix = `${valid.year.padStart(4, '0')}-${valid.month.padStart(2, '0')}`;
    return { from: `${prefix}-01`, to: `${prefix}-${days}` };
}
export function periodLabel(period: DashboardPeriod): string {
    const valid = validatePeriod(period);
    return `${months[Number(valid.month) - 1]} ${valid.year.padStart(4, '0')}`;
}
