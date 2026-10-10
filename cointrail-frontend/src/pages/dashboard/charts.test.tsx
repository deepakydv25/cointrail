import type { ReactNode } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IncomeExpenseChart, { AmountChart } from './IncomeExpenseChart';
import CategorySpending from './CategorySpending';
import { getCategoryBreakdown } from '../../services/analyticsService';
import { categories } from './fixtures';

const observed = vi.hoisted(() => ({ data: [] as { id: string; label: string; amount: string; coordinate: number }[] }));
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
    BarChart: ({ children, data }: { children: ReactNode; data: typeof observed.data }) => { observed.data = data; return <div data-testid="geometry">{children}</div>; },
    Tooltip: ({ content }: { content: (props: object) => ReactNode }) => content({ active: true, payload: [{ payload: observed.data[0] }] }),
    Bar: ({ isAnimationActive, fill }: { isAnimationActive: boolean; fill: string }) => <span data-testid="bar" data-animation={String(isAnimationActive)} data-fill={fill} />,
    CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
}));
vi.mock('../../services/analyticsService');
afterEach(cleanup);
describe('exact dashboard chart equivalents', () => {
    it('uses exact original values for tooltip and visible equivalent, only geometry is normalized', () => {
        render(<IncomeExpenseChart income="99999999999999999.99" expense="0.01" label="October 2026" />);
        const values = screen.getByLabelText('Income and expense for October 2026');
        expect(within(values).getByText('₹99,99,99,99,99,99,99,999.99')).toBeInTheDocument(); expect(within(values).getByText('₹0.01')).toBeInTheDocument();
        expect(screen.getByTestId('geometry').closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true');
        expect(within(screen.getByTestId('geometry')).getByText('₹99,99,99,99,99,99,99,999.99')).toBeInTheDocument();
        expect(within(screen.getByTestId('geometry')).getByText('₹99,99,99,99,99,99,99,999.99')).toHaveClass('ct-amount--income');
        expect(observed.data.map(item => item.coordinate)).toEqual([1_000_000, 0]); expect(observed.data[1].amount).toBe('0.01');
        expect(screen.getByTestId('bar')).toHaveAttribute('data-animation', 'false'); expect(screen.getByTestId('bar')).toHaveAttribute('data-fill', 'var(--ct-primary)');
    });
    it('renders zero data with finite geometry and accessible explicit zeros', () => {
        render(<IncomeExpenseChart income="0" expense="0" label="February 0001" />);
        expect(within(screen.getByLabelText('Income and expense for February 0001')).getAllByText('₹0.00')).toHaveLength(2);
        expect(observed.data.map(item => item.coordinate)).toEqual([0, 0]);
    });
    it('retains exact Long IDs in chart items', () => {
        render(<AmountChart items={[{ id: '9223372036854775807', label: '1', amount: '199999999999999999.98' }]} />);
        expect(observed.data[0]).toEqual({ id: '9223372036854775807', label: '1', amount: '199999999999999999.98', coordinate: 1_000_000 });
    });
    it('uses a complete exact category list when a large set makes the secondary chart impractical', async () => {
        vi.mocked(getCategoryBreakdown).mockResolvedValue({ ...categories, items: Array.from({ length: 13 }, (_, index) => ({ ...categories.items[0], categoryId: String(index + 1), categoryName: `Category ${index + 1}` })) });
        render(<MemoryRouter><CategorySpending from="2026-10-01" to="2026-10-31" label="October 2026" attempt={0} onRetry={() => {}} /></MemoryRouter>);
        const list = await screen.findByRole('list', { name: 'Expense categories for October 2026' }); expect(within(list).getAllByRole('listitem')).toHaveLength(13);
        expect(list.querySelectorAll('.ct-spending-bar')).toHaveLength(13); expect(screen.queryByTestId('geometry')).toBeNull();
    });
});
