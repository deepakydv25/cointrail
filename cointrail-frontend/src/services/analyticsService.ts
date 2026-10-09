import api from '../api/axios';
import { financialConfig } from '../api/financial';
import type { AccountsResponse, AnalyticsGrouping, CategoriesResponse, ComparisonResponse, ReportingRange, SummaryResponse, TrendsResponse } from '../types/analytics';
import { validateRange } from '../pages/analytics/query';

export async function getCategoryBreakdown(range: ReportingRange, signal?: AbortSignal): Promise<CategoriesResponse> {
    return (await api.get<CategoriesResponse>('/api/analytics/categories', { ...financialConfig, params: validateRange(range), signal })).data;
}
export async function getAnalyticsSummary(range: ReportingRange, signal?: AbortSignal): Promise<SummaryResponse> {
    return (await api.get<SummaryResponse>('/api/analytics/summary', { ...financialConfig, params: validateRange(range), signal })).data;
}
export async function getAccountBreakdown(range: ReportingRange, signal?: AbortSignal): Promise<AccountsResponse> {
    return (await api.get<AccountsResponse>('/api/analytics/accounts', { ...financialConfig, params: validateRange(range), signal })).data;
}
export async function getAnalyticsTrends(range: ReportingRange, grouping: AnalyticsGrouping, signal?: AbortSignal): Promise<TrendsResponse> {
    return (await api.get<TrendsResponse>('/api/analytics/trends', { ...financialConfig, params: { ...validateRange(range, grouping), grouping }, signal })).data;
}
export async function getAnalyticsComparison(range: ReportingRange, baseline: ReportingRange, signal?: AbortSignal): Promise<ComparisonResponse> {
    const current = validateRange(range); const comparison = validateRange(baseline);
    return (await api.get<ComparisonResponse>('/api/analytics/comparison', { ...financialConfig, params: { ...current, compareFrom: comparison.from, compareTo: comparison.to }, signal })).data;
}
