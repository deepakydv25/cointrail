import type { TransactionType } from './transaction';

export interface AnalyticsTotals { income: string; expense: string; netCashFlow: string; transactionCount: string }
export interface CategoryGroup {
    categoryId: string; categoryName: string; categoryType: TransactionType; system: boolean; active: boolean; totals: AnalyticsTotals;
}
export interface CategoriesResponse {
    range: { from: string; to: string; dayCount: string }; totals: AnalyticsTotals; items: CategoryGroup[];
}
