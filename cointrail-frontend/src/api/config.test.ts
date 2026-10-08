import { describe, expect, it } from 'vitest';
import { normalizeApiBase } from './config';

describe('API base configuration', () => {
    it.each([
        ['http://localhost:8081', 'http://localhost:8081'],
        ['https://api.example.com/', 'https://api.example.com'],
        ['https://api.example.com/api/v1/', 'https://api.example.com'],
        ['https://api.example.com/cointrail/api/v1', 'https://api.example.com/cointrail'],
        ['https://api.example.com/cointrail/', 'https://api.example.com/cointrail'],
    ])('normalizes %s', (input, output) => expect(normalizeApiBase(input)).toBe(output));
    it.each([undefined, '', '/api', 'not a url', 'ftp://api.example.com', 'https://user:pass@api.example.com', 'https://api.example.com?token=secret', 'https://api.example.com/#part'])('rejects invalid configuration %s', input => expect(() => normalizeApiBase(input)).toThrow());
});
