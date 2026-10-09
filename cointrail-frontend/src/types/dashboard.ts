import type { TransactionType } from './transaction';

// financialConfig preserves every JSON numeric token as a string.
export interface DashboardPeriod { year: string; month: string }
export interface RecentTransaction {
    id: string; type: TransactionType; amount: string; description: string | null; transactionDate: string;
    accountId: string; accountName: string; categoryId: string; categoryName: string;
}
export interface PendingRecurringTransaction {
    id: string; type: TransactionType; amount: string; description: string | null;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'; nextDueDate: string;
    accountId: string; accountName: string; categoryId: string; categoryName: string;
    status: 'ACTIVE' | 'PAUSED' | 'BLOCKED' | 'CANCELLED' | 'COMPLETED'; blockedReason: string | null; overdue: boolean;
}
export interface DashboardResponse extends DashboardPeriod {
    totalActiveAccountBalance: string;
    monthlySummary: { income: string; expense: string; netCashFlow: string };
    budgetSummary: { budgetCount: string; totalBudgetAmount: string; spentOnBudgetedCategories: string; remainingBudgetAmount: string; overBudgetCount: string };
    recentTransactions: RecentTransaction[];
    pendingRecurringTransactions: { asOfDate: string; throughDate: string; timezone: string; items: PendingRecurringTransaction[] };
}
