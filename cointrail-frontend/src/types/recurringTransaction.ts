import type { TransactionType } from './transaction';
export const recurringStatuses = ['ACTIVE', 'PAUSED', 'BLOCKED', 'CANCELLED', 'COMPLETED'] as const;
export type RecurringStatus = typeof recurringStatuses[number];
export const recurrenceFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type RecurrenceFrequency = typeof recurrenceFrequencies[number];
export const recurringSorts = ['createdAt,desc', 'createdAt,asc', 'updatedAt,desc', 'updatedAt,asc', 'nextDueDate,asc', 'nextDueDate,desc'] as const;
export type RecurringSort = typeof recurringSorts[number];
export interface RecurringTransactionResponse {
    id: string; accountId: string; accountName: string; categoryId: string; categoryName: string;
    type: TransactionType; amount: string; description: string | null; frequency: RecurrenceFrequency;
    startDate: string; endDate: string | null; nextDueDate: string | null; status: RecurringStatus;
    blockedReason: string | null; createdAt: string; updatedAt: string;
}
export interface UpdateRecurringTransactionRequest { accountId: string; categoryId: string; amount: string; description: string | null }
export interface CreateRecurringTransactionRequest extends UpdateRecurringTransactionRequest {
    type: TransactionType; frequency: RecurrenceFrequency; startDate: string; endDate: string | null;
}
export interface RecurringPage { content: RecurringTransactionResponse[]; number: string; size: string; totalElements: string; totalPages: string }
export interface RecurringQuery {
    status?: RecurringStatus; type?: TransactionType; accountId?: string; categoryId?: string;
    page: string; size: string; sort: RecurringSort;
}
export function isTerminal(status: RecurringStatus): boolean { return status === 'CANCELLED' || status === 'COMPLETED'; }
