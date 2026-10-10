import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './returnPath';

describe('login return navigation', () => {
    it.each(['/expenses/7/edit?source=legacy#description', '/expenses?category=FOOD', '/app/accounts', '/app', '/dashboard', '/app/dashboard?year=2024&month=2#budget-summary-heading'])('retains protected path %s', path => expect(safeReturnPath(path)).toBe(path));
    it.each([undefined, 'https://evil.example', '//evil.example', '/\\evil.example', '/login', '/register', '/expenses/../login', '/app/../../login', '/%2f%2fevil.example'])('rejects unsafe/nonprotected path %s', path => expect(safeReturnPath(path)).toBe('/app/dashboard'));
});
