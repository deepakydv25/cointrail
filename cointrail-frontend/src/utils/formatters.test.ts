import { describe, expect, it } from "vitest";
import { formatCategory, formatCurrency, formatDate } from "./formatters";

describe('formatCurrency', () => {

    it('formats amount as Indian Rupees', () => {
        expect(formatCurrency(1500))
            .toBe('₹1,500.00');
    });

    it('formats zero amount', () => {
        expect(formatCurrency(0))
            .toBe('₹0.00');
    });
});

describe('formatCategory', () => {

    it('convert enum category to display text', () => {
        expect(formatCategory('FOOD'))
            .toBe('Food');

        expect(formatCategory('ENTERTAINMENT'))
            .toBe('Entertainment');
    });
});

describe('formatDate', () => {

    it('formats expense date for display', () => {
        expect(formatDate('2026-09-16'))
            .toBe('16 Sept 2026');
    });
});

