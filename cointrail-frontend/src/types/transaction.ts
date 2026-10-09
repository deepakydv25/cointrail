export const transactionTypes = ['EXPENSE', 'INCOME'] as const;
export type TransactionType = typeof transactionTypes[number];
export const transactionSorts = ['transactionDate,desc', 'transactionDate,asc', 'amount,desc', 'amount,asc', 'createdAt,desc', 'createdAt,asc', 'updatedAt,desc', 'updatedAt,asc'] as const;
export type TransactionSort = typeof transactionSorts[number];
export interface TransactionResponse {
    id: string; type: TransactionType; amount: string; description: string | null; transactionDate: string;
    accountId: string; accountName: string; categoryId: string; categoryName: string;
    createdAt: string; updatedAt: string;
}
export interface CreateTransactionRequest {
    accountId: string; categoryId: string; type: TransactionType; amount: string;
    description: string | null; transactionDate: string;
}
export type UpdateTransactionRequest = CreateTransactionRequest;
// The financial parser returns all numeric tokens as exact strings, including Page metadata.
export interface TransactionPage {
    content: TransactionResponse[]; number: string; size: string; totalElements: string; totalPages: string;
}
export interface TransactionQuery {
    type?: TransactionType; accountId?: string; categoryId?: string; from?: string; to?: string;
    page: string; size: string; sort: TransactionSort;
}
