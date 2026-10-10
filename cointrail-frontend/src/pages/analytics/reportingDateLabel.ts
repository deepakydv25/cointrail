import { isDate } from '../transactions/query';

export function reportingDateLabel(iso: string, locale?: string): string {
    if (!isDate(iso)) return iso;
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}
