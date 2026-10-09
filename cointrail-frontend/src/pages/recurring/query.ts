import { ApiError } from '../../api/errors';
import { longId } from '../../api/financial';
import { transactionTypes, type TransactionType } from '../../types/transaction';
import { recurringSorts, recurringStatuses, type RecurringQuery, type RecurringSort, type RecurringStatus } from '../../types/recurringTransaction';

const keys = ['status', 'type', 'accountId', 'categoryId', 'page', 'size', 'sort'];
export function recurringQuery(search: string): RecurringQuery {
    const params = new URLSearchParams(search);
    const invalid = () => { throw new ApiError('Check your recurring filters, page size or sort.', 'validation', 400); };
    for (const key of params.keys()) if (!keys.includes(key) || params.getAll(key).length !== 1) invalid();
    const status = params.get('status') || undefined; const type = params.get('type') || undefined;
    const accountId = params.get('accountId') || undefined; const categoryId = params.get('categoryId') || undefined;
    const page = params.get('page') ?? '0'; const size = params.get('size') ?? '20'; const sort = params.get('sort') ?? 'createdAt,desc';
    if (status && !recurringStatuses.includes(status as RecurringStatus)) invalid();
    if (type && !transactionTypes.includes(type as TransactionType)) invalid();
    if (!recurringSorts.includes(sort as RecurringSort)) invalid();
    if (!/^\d{1,10}$/.test(page) || BigInt(page) > 2147483647n || !/^\d{1,3}$/.test(size) || BigInt(size) < 1n || BigInt(size) > 100n) invalid();
    try { if (accountId) longId(accountId); if (categoryId) longId(categoryId); } catch { invalid(); }
    return { status: status as RecurringStatus | undefined, type: type as TransactionType | undefined, accountId, categoryId, page: String(BigInt(page)), size: String(BigInt(size)), sort: sort as RecurringSort };
}
export function recurringSearch(query: RecurringQuery): string {
    const params = new URLSearchParams();
    for (const key of keys) { const value = query[key as keyof RecurringQuery]; if (value !== undefined) params.set(key, value); }
    // Validate page changes and service callers as well as URL entry points.
    recurringQuery(params.toString()); return `?${params}`;
}
