import type { ReportingRange } from '../../types/analytics';
import { reportingDateLabel } from './reportingDateLabel';

export function ReportingDates({ from, to, locale }: ReportingRange & { locale?: string }) {
    return <><time dateTime={from}>{reportingDateLabel(from, locale)}</time>{to !== from && <> – <time dateTime={to}>{reportingDateLabel(to, locale)}</time></>}</>;
}
