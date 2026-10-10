import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import AnalyticsTrendChart, { TrendTooltip } from './AnalyticsTrendChart';
import CategoryBreakdown from './CategoryBreakdown';
import { categories, trends } from './fixtures';
import { formatMoney } from '../../api/financial';
import type { ReactNode } from 'react';
import { reportingDateLabel } from './reportingDateLabel';
async function openBreakdown() { await userEvent.click(screen.getByText('View detailed breakdown')); return screen.getByRole('table'); }
const observed = vi.hoisted(() => ({ data: [] as Array<{ incomeCoordinate?: number; expenseCoordinate?: number }> }));
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
    BarChart: ({ children, data }: { children: ReactNode; data: typeof observed.data }) => { observed.data = data; return <div>{children}</div>; },
    Tooltip: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
    Bar: ({ isAnimationActive, dataKey, fill }: { isAnimationActive: boolean; dataKey: string; fill: string }) => <span data-testid="series" data-animation={String(isAnimationActive)} data-key={dataKey} data-fill={fill} />,
}));
afterEach(cleanup);
describe('Analytics exact accessible chart presentation', () => {
    it('renders a daily bucket once while retaining exact values and its machine-readable date', async () => {
        render(<AnalyticsTrendChart report={{ ...trends, grouping: 'DAILY', items: [{ ...trends.items[0], from: '2024-02-29', to: '2024-02-29' }] }} />);
        const table = await openBreakdown(); expect(table).toHaveAccessibleName('Exact daily bucket values');
        expect(table.querySelectorAll('time')).toHaveLength(1);
        expect(table.querySelector('time')).toHaveAttribute('datetime', '2024-02-29');
        expect(within(table).getByRole('columnheader', { name: 'Date / period' })).toBeInTheDocument();
        expect(within(table).getByRole('rowheader')).toHaveTextContent(reportingDateLabel('2024-02-29'));
    });
    it('keeps exact monthly edges instead of substituting whole calendar months', async () => {
        render(<AnalyticsTrendChart report={{ ...trends, grouping: 'MONTHLY', range: { from: '2024-01-29', to: '2024-02-03', dayCount: '6' }, items: [
            { ...trends.items[0], from: '2024-01-29', to: '2024-01-31' }, { ...trends.items[1], from: '2024-02-01', to: '2024-02-03' },
        ] }} />);
        const table = await openBreakdown(); expect(table).toHaveAccessibleName('Exact monthly bucket values');
        expect([...table.querySelectorAll('time')].map(t => t.dateTime)).toEqual(['2024-01-29', '2024-01-31']);
        expect(within(table).getAllByRole('row')).toHaveLength(2);
    });
    it('shows active dates first and lets users reveal every zero-filled clipped bucket', async () => {
        render(<AnalyticsTrendChart report={trends} />);
        const table = await openBreakdown(); expect(table).toHaveAccessibleName('Exact weekly bucket values');
        expect(within(table).getAllByRole('row')).toHaveLength(3); expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
        expect(within(table).getByRole('rowheader', { name: `${reportingDateLabel('2024-02-01')} – ${reportingDateLabel('2024-02-04')}` })).toBeInTheDocument();
        expect(within(table).getByText(formatMoney(trends.totals.expense))).toBeInTheDocument(); expect(within(table).getByText('9007199254740993')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Exact trend data' })).toHaveAttribute('tabindex', '0');
        expect(screen.getByText('View detailed breakdown')).toBeInTheDocument(); expect(screen.getByRole('checkbox', { name: 'Show all dates' })).not.toBeChecked();
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show all dates' }));
        expect(within(table).getAllByRole('row')).toHaveLength(6);
        expect(document.querySelector('.ct-dashboard-chart')).toHaveAttribute('aria-hidden', 'true');
        expect(observed.data[0]).toMatchObject({ incomeCoordinate: 500000, expenseCoordinate: 1000000 });
        expect(screen.getAllByTestId('series').map(series => series.getAttribute('data-key'))).toEqual(['incomeCoordinate', 'expenseCoordinate']);
        expect(screen.getAllByTestId('series').map(series => series.getAttribute('data-fill'))).toEqual(['var(--ct-analytics-income)', 'var(--ct-analytics-expense)']);
        screen.getAllByTestId('series').forEach(series => expect(series).toHaveAttribute('data-animation', 'false'));
    });
    it('tooltip uses original exact strings and returned dates', () => {
        render(<TrendTooltip bucket={trends.items[0]} />); expect(screen.getByText(`Expense: ${formatMoney(trends.totals.expense)}`)).toBeInTheDocument();
        expect(document.querySelectorAll('time')).toHaveLength(2);
        expect([...document.querySelectorAll('time')].map(t => t.dateTime)).toEqual(['2024-02-01', '2024-02-04']);
    });
    it('shows all same-name ID groups with neutral tags and eligible historical drill-downs', async () => {
        render(<MemoryRouter><CategoryBreakdown report={categories} /></MemoryRouter>);
        const links = screen.getAllByRole('link', { name: 'Same name' }); expect(links).toHaveLength(2);
        expect(links[0]).toHaveAttribute('href', '/app/transactions?from=2024-02-01&to=2024-02-29&categoryId=9007199254740993&type=EXPENSE&page=0');
        expect(links[1]).toHaveAttribute('href', '/app/transactions?from=2024-02-01&to=2024-02-29&categoryId=9223372036854775807&type=EXPENSE&page=0');
        expect(document.querySelectorAll('.ct-category-icon')).toHaveLength(2);
        const spendingFill = document.querySelector<HTMLElement>('.ct-analytics-progress span')?.style.backgroundColor ?? '';
        expect(spendingFill).toMatch(/^rgb\(/);
        const [red, , blue] = spendingFill.match(/\d+/g)!.map(Number);
        expect(blue).toBeGreaterThan(red);
        expect(links[0].parentElement?.querySelector('strong')).toHaveClass('ct-amount--expense');
        await userEvent.selectOptions(screen.getByLabelText('Show category activity'), 'INCOME');
        expect(screen.getByRole('link', { name: 'Salary' })).toHaveAttribute('href', '/app/transactions?from=2024-02-01&to=2024-02-29&categoryId=3&type=INCOME&page=0');
        expect(screen.getByRole('link', { name: 'Salary' }).parentElement?.querySelector('strong')).toHaveClass('ct-amount--income');
        expect(screen.queryByRole('link', { name: 'Same name' })).toBeNull();
    });
    it('keeps zero-filled data table available for an empty trend report', async () => {
        render(<AnalyticsTrendChart report={{ ...trends, totals: { income: '0', expense: '0', netCashFlow: '0', transactionCount: '0' }, items: [trends.items[1]] }} />);
        expect(screen.getByText('No recorded transactions in this range.')).toBeInTheDocument(); await openBreakdown(); expect(screen.getAllByRole('row')).toHaveLength(1);
    });
    it('does not truncate complete category groups', () => {
        render(<MemoryRouter><CategoryBreakdown report={{ ...categories, items: Array.from({ length: 120 }, (_, index) => ({ ...categories.items[0], categoryId: String(index + 1), categoryName: `Group ${index}` })) }} /></MemoryRouter>);
        const list = screen.getByRole('list'); expect(list.children).toHaveLength(120);
        expect(within(list.lastElementChild as HTMLElement).getByRole('link', { name: 'Group 119' })).toBeInTheDocument();
    });
});
