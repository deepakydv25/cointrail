import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ReportingDates } from './dateLabels';
import { reportingDateLabel } from './reportingDateLabel';
afterEach(cleanup);
describe('exact calendar-date labels', () => {
    it('formats leap days, historical years and locales without changing dates', () => {
        expect(reportingDateLabel('2024-02-29', 'en-GB')).toBe('29 Feb 2024');
        expect(reportingDateLabel('0099-01-01', 'en-GB')).toBe('1 Jan 99');
        expect(reportingDateLabel('0001-01-01', 'en-GB')).toBe('1 Jan 1');
        expect(reportingDateLabel('9999-12-31', 'en-US')).toBe('Dec 31, 9999');
        expect(reportingDateLabel('2024-02-30', 'en-GB')).toBe('2024-02-30');
    });
    it('renders one exact time for a day and two for actual clipped boundaries', () => {
        const view = render(<ReportingDates from="2024-02-29" to="2024-02-29" locale="en-GB" />);
        expect(view.container.querySelectorAll('time')).toHaveLength(1);
        expect(view.container.querySelector('time')).toHaveAttribute('datetime', '2024-02-29');
        view.rerender(<ReportingDates from="2024-02-26" to="2024-02-29" locale="en-GB" />);
        expect(view.container).toHaveTextContent('26 Feb 2024 – 29 Feb 2024');
        expect([...view.container.querySelectorAll('time')].map(t => t.dateTime)).toEqual(['2024-02-26', '2024-02-29']);
    });
});
