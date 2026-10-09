import type { AccountsResponse, CategoriesResponse, ComparisonResponse, SummaryResponse, TrendsResponse } from '../../types/analytics';

export const range = { from: '2024-02-01', to: '2024-02-29', dayCount: '29' };
export const totals = { income: '99999999999999999.99', expense: '199999999999999999.98', netCashFlow: '-99999999999999999.99', transactionCount: '9007199254740993' };
export const summary: SummaryResponse = { range, totals };
export const categories: CategoriesResponse = { ...summary, items: [
    { categoryId: '9007199254740993', categoryName: 'Same name', categoryType: 'EXPENSE', active: false, system: false, totals: { income: '0', expense: '99999999999999999.99', netCashFlow: '-99999999999999999.99', transactionCount: '1' } },
    { categoryId: '9223372036854775807', categoryName: 'Same name', categoryType: 'EXPENSE', active: true, system: true, totals: { income: '0', expense: '0.01', netCashFlow: '-0.01', transactionCount: '1' } },
    { categoryId: '3', categoryName: 'Salary', categoryType: 'INCOME', active: false, system: true, totals: { income: '99999999999999999.99', expense: '0', netCashFlow: '99999999999999999.99', transactionCount: '1' } },
] };
export const accounts: AccountsResponse = { ...summary, items: [{ accountId: '9223372036854775807', accountName: 'Historical bank', accountType: 'BANK', active: false, totals }] };
export const trends: TrendsResponse = { ...summary, grouping: 'WEEKLY', items: [
    { from: '2024-02-01', to: '2024-02-04', totals },
    { from: '2024-02-05', to: '2024-02-11', totals: { income: '0', expense: '0', netCashFlow: '0', transactionCount: '0' } },
    { from: '2024-02-12', to: '2024-02-18', totals: { income: '0.01', expense: '0', netCashFlow: '0.01', transactionCount: '1' } },
    { from: '2024-02-19', to: '2024-02-25', totals: { income: '0', expense: '0', netCashFlow: '0', transactionCount: '0' } },
    { from: '2024-02-26', to: '2024-02-29', totals: { income: '0', expense: '0', netCashFlow: '0', transactionCount: '0' } },
] };
export const comparison: ComparisonResponse = { current: summary, baseline: { range: { from: '2024-02-01', to: '2024-02-01', dayCount: '1' }, totals: { income: '0', expense: '0', netCashFlow: '0', transactionCount: '0' } }, delta: totals };
