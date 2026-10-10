import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import CategoryIcon from './CategoryIcon';
import { categoryGlyph } from './categoryGlyph';
import { FinancialRow } from './ui/FinancialRow';
import { MemoryRouter } from 'react-router-dom';
afterEach(cleanup);
describe('seeded category glyphs', () => {
    it.each([
        ['Food', 'EXPENSE', 'utensils'], ['Travel', 'EXPENSE', 'suitcase'], ['Shopping', 'EXPENSE', 'shopping-bag'],
        ['Entertainment', 'EXPENSE', 'film'], ['Bills', 'EXPENSE', 'receipt'], ['Health', 'EXPENSE', 'medical'],
        ['Education', 'EXPENSE', 'graduation'], ['Other', 'EXPENSE', 'tag'], ['Rent', 'EXPENSE', 'house'],
        ['Subscription', 'EXPENSE', 'repeat'], ['Salary', 'INCOME', 'briefcase'], ['Bonus', 'INCOME', 'gift'],
        ['Freelance', 'INCOME', 'laptop'], ['Interest', 'INCOME', 'percent'], ['Other Income', 'INCOME', 'tag'],
    ])('maps %s with expected type %s', (name, type, glyph) => {
        expect(categoryGlyph({ name, type, system: true })).toBe(glyph);
        expect(categoryGlyph({ name: ` ${name.toUpperCase()} `, type })).toBe(glyph);
        expect(categoryGlyph({ name, type, system: false })).toBe('tag');
    });
    it('falls back for missing metadata, mismatched type and unknown names', () => {
        for (const metadata of [{}, { name: 'Food' }, { name: 'Food', type: 'INCOME', system: true }, { name: 'Custom', type: 'EXPENSE' }, { name: 'constructor' }, { name: '__proto__' }]) expect(categoryGlyph(metadata)).toBe('tag');
    });
    it('keeps icons decorative and passes reference metadata through financial rows', () => {
        const view = render(<CategoryIcon name="Food" type="EXPENSE" size="small" />);
        const paths = view.container.querySelector('svg')!.innerHTML;
        expect(view.container.firstChild).toHaveAttribute('aria-hidden', 'true'); view.unmount();
        render(<MemoryRouter><FinancialRow title="Lunch" to="/app/transactions/1" amount="₹0.01" type="EXPENSE" metadata="Recorded" category="Category: Food" categoryName="Food" /></MemoryRouter>);
        expect(document.querySelector('.ct-category-icon svg')!.innerHTML).toBe(paths);
    });
});
