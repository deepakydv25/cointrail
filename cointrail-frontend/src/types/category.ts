export const categoryTypes = ['EXPENSE', 'INCOME'] as const;
export type CategoryType = typeof categoryTypes[number];
export interface CategoryResponse {
    id: string;
    name: string;
    type: CategoryType;
    system: boolean;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CreateCategoryRequest { name: string; type: CategoryType }
export interface UpdateCategoryRequest { name: string }
