import api from '../api/axios';
import { financialConfig, longId } from '../api/financial';
import type { CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from '../types/category';

export async function getCategories(signal?: AbortSignal): Promise<CategoryResponse[]> {
    return (await api.get('/api/categories', { ...financialConfig, signal })).data;
}
export async function getCategory(id: string, signal?: AbortSignal): Promise<CategoryResponse> {
    return (await api.get(`/api/categories/${longId(id)}`, { ...financialConfig, signal })).data;
}
export async function createCategory(request: CreateCategoryRequest): Promise<CategoryResponse> {
    return (await api.post('/api/categories', { name: request.name, type: request.type }, financialConfig)).data;
}
export async function updateCategory(id: string, request: UpdateCategoryRequest): Promise<CategoryResponse> {
    return (await api.put(`/api/categories/${longId(id)}`, { name: request.name }, financialConfig)).data;
}
export async function deactivateCategory(id: string): Promise<void> {
    await api.delete(`/api/categories/${longId(id)}`, financialConfig);
}
