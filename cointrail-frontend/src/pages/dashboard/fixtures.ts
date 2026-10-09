// Raw numeric-string DTO fixtures shared by the dashboard behavior/chart suites.
import type { DashboardResponse } from '../../types/dashboard';
import type { CategoriesResponse } from '../../types/analytics';

export const dashboard: DashboardResponse = {
    year: '2026', month: '10', totalActiveAccountBalance: '-199999999999999999.98',
    monthlySummary: { income: '99999999999999999.99', expense: '0.01', netCashFlow: '-0.01' },
    budgetSummary: { budgetCount: '2', totalBudgetAmount: '100', spentOnBudgetedCategories: '90', remainingBudgetAmount: '10', overBudgetCount: '1' },
    recentTransactions: [
        { id: '9223372036854775807', type: 'INCOME', amount: '99999999999999999.99', description: 'Outside selected month', transactionDate: '2026-09-01', accountId: '9007199254740993', accountName: 'Historical bank', categoryId: '9007199254740994', categoryName: 'Salary' },
        { id: '9007199254740993', type: 'EXPENSE', amount: '0.01', description: null, transactionDate: '2026-08-01', accountId: '9007199254740993', accountName: 'Historical bank', categoryId: '9007199254740995', categoryName: 'Food' },
    ],
    pendingRecurringTransactions: { asOfDate: '2026-10-10', throughDate: '2026-11-09', timezone: 'Pacific/Kiritimati', items: [
        { id: '9007199254740996', type: 'EXPENSE', amount: '0.01', description: null, frequency: 'MONTHLY', nextDueDate: '2026-10-01', accountId: '9007199254740993', accountName: 'Historical bank', categoryId: '9007199254740995', categoryName: 'Food', status: 'BLOCKED', blockedReason: null, overdue: true },
        { id: '9007199254740997', type: 'INCOME', amount: '10', description: 'Due today income', frequency: 'DAILY', nextDueDate: '2026-10-10', accountId: '9007199254740993', accountName: 'Historical bank', categoryId: '9007199254740994', categoryName: 'Salary', status: 'ACTIVE', blockedReason: null, overdue: false },
    ] },
};
export const categories: CategoriesResponse = {
    range: { from: '2026-10-01', to: '2026-10-31', dayCount: '31' }, totals: { income: '1', expense: '0.01', netCashFlow: '0.99', transactionCount: '9007199254740993' },
    items: [
        { categoryId: '9007199254740995', categoryName: 'Same name', categoryType: 'EXPENSE', system: false, active: false, totals: { income: '0', expense: '0.01', netCashFlow: '-0.01', transactionCount: '1' } },
        { categoryId: '9223372036854775807', categoryName: 'Same name', categoryType: 'EXPENSE', system: true, active: true, totals: { income: '0', expense: '99999999999999999.99', netCashFlow: '-99999999999999999.99', transactionCount: '1' } },
        { categoryId: '9007199254740994', categoryName: 'Income category', categoryType: 'INCOME', system: true, active: true, totals: { income: '1', expense: '0', netCashFlow: '1', transactionCount: '1' } },
    ],
};
