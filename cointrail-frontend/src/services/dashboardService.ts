import api from '../api/axios';
import { financialConfig } from '../api/financial';
import type { DashboardPeriod, DashboardResponse } from '../types/dashboard';
import { validatePeriod } from '../pages/dashboard/period';

export async function getDashboard(period: DashboardPeriod, signal?: AbortSignal): Promise<DashboardResponse> {
    return (await api.get<DashboardResponse>('/api/dashboard', { ...financialConfig, params: validatePeriod(period), signal })).data;
}
