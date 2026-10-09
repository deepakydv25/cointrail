import type { TransactionType } from './transaction';
import type { AccountType } from './account';

export const analyticsGroupings = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type AnalyticsGrouping = typeof analyticsGroupings[number];
export interface ReportingRange { from: string; to: string }
export interface AnalyticsRange extends ReportingRange { dayCount: string }
export interface AnalyticsQuery extends ReportingRange { grouping: AnalyticsGrouping; compareFrom?: string; compareTo?: string }
export interface SummaryResponse { range: AnalyticsRange; totals: AnalyticsTotals }
export interface AccountGroup { accountId: string; accountName: string; accountType: AccountType; active: boolean; totals: AnalyticsTotals }
export interface AccountsResponse extends SummaryResponse { items: AccountGroup[] }
export interface AnalyticsBucket extends ReportingRange { totals: AnalyticsTotals }
export interface TrendsResponse extends SummaryResponse { grouping: AnalyticsGrouping; items: AnalyticsBucket[] }
export interface ComparisonResponse { current: SummaryResponse; baseline: SummaryResponse; delta: AnalyticsTotals }

export interface AnalyticsTotals { income: string; expense: string; netCashFlow: string; transactionCount: string }
export interface CategoryGroup {
    categoryId: string; categoryName: string; categoryType: TransactionType; system: boolean; active: boolean; totals: AnalyticsTotals;
}
export interface CategoriesResponse {
    range: AnalyticsRange; totals: AnalyticsTotals; items: CategoryGroup[];
}
