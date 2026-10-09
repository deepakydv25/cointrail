import { describe, expect, it } from 'vitest';
import { recurringQuery, recurringSearch } from './query';
import { recurringSorts, recurringStatuses } from '../../types/recurringTransaction';

describe('Recurring URL state', () => {
    it('provides explicit backend defaults and round trips exact historical IDs', () => {
        expect(recurringQuery('')).toMatchObject({ page: '0', size: '20', sort: 'createdAt,desc' });
        const query = recurringQuery('?accountId=9223372036854775807&categoryId=9007199254740993&type=INCOME&status=BLOCKED&page=0002&size=005&sort=nextDueDate,asc');
        expect(query).toMatchObject({ accountId: '9223372036854775807', categoryId: '9007199254740993', type: 'INCOME', status: 'BLOCKED', page: '2', size: '5' });
        expect(recurringQuery(recurringSearch(query))).toEqual(query);
    });
    it.each(recurringStatuses)('accepts backend status %s', status => expect(recurringQuery(`status=${status}`).status).toBe(status));
    it.each(recurringSorts)('accepts backend sort %s', sort => expect(recurringQuery(`sort=${sort}`).sort).toBe(sort));
    it.each(['status=UNKNOWN', 'type=TRANSFER', 'page=-1', 'page=1e2', 'page=2147483648', 'size=0', 'size=101', 'size=', 'sort=amount,desc', 'sort=', 'accountId=0', 'categoryId=9223372036854775808', 'accountId=1&accountId=2', 'page=0&page=1', 'from=2026-01-01'])('rejects unsupported URL %s', query => {
        expect(() => recurringQuery(query)).toThrow();
    });
    it('accepts supported bounds and clear optional filters', () => {
        expect(recurringQuery('page=2147483647&size=100&status=&accountId=')).toMatchObject({ page: '2147483647', size: '100', status: undefined, accountId: undefined });
    });
});
