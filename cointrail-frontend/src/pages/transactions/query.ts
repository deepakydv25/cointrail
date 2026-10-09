import { ApiError } from '../../api/errors';
import { longId } from '../../api/financial';
import { transactionSorts, transactionTypes } from '../../types/transaction';
import type { TransactionQuery, TransactionSort, TransactionType } from '../../types/transaction';

export function isDate(value: string): boolean {
    if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function transactionQuery(search: string): TransactionQuery {
    const params = new URLSearchParams(search);
    const type = params.get('type') || undefined;
    const sort = params.get('sort') || 'transactionDate,desc';
    const page = params.get('page') || '0'; const size = params.get('size') || '20';
    const from = params.get('from') || undefined; const to = params.get('to') || undefined;
    const invalid = () => { throw new ApiError('Check your transaction filters, dates, page size or sort.', 'validation', 400); };
    if (type && !transactionTypes.includes(type as TransactionType)) invalid();
    if (!transactionSorts.includes(sort as TransactionSort)) invalid();
    if (!/^\d{1,10}$/.test(page) || BigInt(page) > 2147483647n || !/^\d{1,3}$/.test(size) || BigInt(size) < 1n || BigInt(size) > 100n) invalid();
    if ((from && !isDate(from)) || (to && !isDate(to)) || (from && to && from > to)) invalid();
    const accountId = params.get('accountId') || undefined; const categoryId = params.get('categoryId') || undefined;
    try { if (accountId) longId(accountId); if (categoryId) longId(categoryId); } catch { invalid(); }
    return { type: type as TransactionType | undefined, accountId, categoryId, from, to, page, size, sort: sort as TransactionSort };
}
