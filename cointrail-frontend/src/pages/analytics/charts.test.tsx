import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import AnalyticsTrendChart, { TrendTooltip } from './AnalyticsTrendChart';
import CategoryBreakdown from './CategoryBreakdown';
import { categories, trends } from './fixtures';
import { formatMoney } from '../../api/financial';
import type { ReactNode } from 'react';
const observed = vi.hoisted(() => ({ data: [] as Array<{ incomeCoordinate?: number; expenseCoordinate?: number }> }));
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
    BarChart: ({ children, data }: { children: ReactNode; data: typeof observed.data }) => { observed.data = data; return <div>{children}</div>; },
    Tooltip: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
    Bar: ({ isAnimationActive, dataKey }: { isAnimationActive: boolean; dataKey: string }) => <span data-testid="series" data-animation={String(isAnimationActive)} data-key={dataKey} />,
}));
afterEach(cleanup);
describe('Analytics exact accessible chart presentation', () => {
    it('exposes every zero-filled clipped bucket in a semantic table independent of hovering', () => {
        render(<AnalyticsTrendChart report={trends} />);
        const table = screen.getByRole('table', { name: 'Exact weekly bucket values' });
        expect(within(table).getAllByRole('row')).toHaveLength(6); expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
        expect(within(table).getByRole('rowheader', { name: /2024-02-01.*through 2024-02-04/ })).toBeInTheDocument(); expect(within(table).getByRole('rowheader', { name: /2024-02-26.*through 2024-02-29/ })).toBeInTheDocument();
        expect(within(table).getByText(formatMoney(trends.totals.expense))).toBeInTheDocument(); expect(within(table).getByText('9007199254740993')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Exact trend data' })).toHaveAttribute('tabindex', '0');
        expect(screen.getByText(/Tiny amounts may be invisible/)).toBeInTheDocument();
        expect(document.querySelector('.ct-dashboard-chart')).toHaveAttribute('aria-hidden', 'true');
        expect(observed.data[0]).toMatchObject({ incomeCoordinate: 500000, expenseCoordinate: 1000000 });
        expect(screen.getAllByTestId('series').map(series => series.getAttribute('data-key'))).toEqual(['incomeCoordinate', 'expenseCoordinate']);
        screen.getAllByTestId('series').forEach(series => expect(series).toHaveAttribute('data-animation', 'false'));
    });
    it('tooltip uses original exact strings and returned dates', () => {
        render(<TrendTooltip bucket={trends.items[0]} />); expect(screen.getByText(`Expense: ${formatMoney(trends.totals.expense)}`)).toBeInTheDocument();
        expect(screen.getByText('2024-02-01 through 2024-02-04')).toBeInTheDocument();
    });
    it('shows all same-name ID groups with neutral tags and eligible historical drill-downs', async () => {
        render(<MemoryRouter><CategoryBreakdown report={categories} /></MemoryRouter>);
        const links = screen.getAllByRole('link', { name: 'Same name' }); expect(links).toHaveLength(2);
        expect(links[0]).toHaveAttribute('href', '/app/transactions?from=2024-02-01&to=2024-02-29&categoryId=9007199254740993&type=EXPENSE&page=0');
        expect(links[1]).toHaveAttribute('href', '/app/transactions?from=2024-02-01&to=2024-02-29&categoryId=9223372036854775807&type=EXPENSE&page=0');
        expect(document.querySelectorAll('.ct-category-icon')).toHaveLength(2);
        await userEvent.selectOptions(screen.getByLabelText('Category breakdown view'), 'INCOME');
        expect(screen.getByRole('link', { name: 'Salary' })).toHaveAttribute('href', '/app/transactions?from=2024-02-01&to=2024-02-29&categoryId=3&type=INCOME&page=0');
        expect(screen.queryByRole('link', { name: 'Same name' })).toBeNull();
    });
    it('keeps zero-filled data table available for an empty trend report', () => {
        render(<AnalyticsTrendChart report={{ ...trends, totals: { income: '0', expense: '0', netCashFlow: '0', transactionCount: '0' }, items: [trends.items[1]] }} />);
        expect(screen.getByText('No recorded transactions in this range.')).toBeInTheDocument(); expect(screen.getAllByRole('row')).toHaveLength(2);
    });
    it('does not truncate complete category groups', () => {
        render(<MemoryRouter><CategoryBreakdown report={{ ...categories, items: Array.from({ length: 120 }, (_, index) => ({ ...categories.items[0], categoryId: String(index + 1), categoryName: `Group ${index}` })) }} /></MemoryRouter>);
        const list = screen.getByRole('list'); expect(list.children).toHaveLength(120);
        expect(within(list.lastElementChild as HTMLElement).getByRole('link', { name: 'Group 119' })).toBeInTheDocument();
    });
});
