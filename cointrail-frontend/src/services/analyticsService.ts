import api from '../api/axios';
import { financialConfig } from '../api/financial';
import { ApiError } from '../api/errors';
import type { CategoriesResponse } from '../types/analytics';
import { isDate } from '../pages/transactions/query';

// Only the category read needed by Dashboard V2; no full analytics frontend.
export async function getCategoryBreakdown(range: { from: string; to: string }, signal?: AbortSignal): Promise<CategoriesResponse> {
    if (!isDate(range.from) || !isDate(range.to) || range.from > range.to)
        throw new ApiError('Choose a valid category reporting range.', 'validation', 400);
    return (await api.get<CategoriesResponse>('/api/analytics/categories', { ...financialConfig, params: range, signal })).data;
}
