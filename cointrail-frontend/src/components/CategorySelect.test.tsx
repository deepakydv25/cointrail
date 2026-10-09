import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategorySelect from './CategorySelect';
import type { CategoryResponse } from '../types/category';

const category: CategoryResponse = { id: '9007199254740993', name: 'Lunch', type: 'EXPENSE', system: false, active: true, createdAt: '2026-10-09T12:00:00', updatedAt: '2026-10-09T12:00:00' };
describe('eligible V2 category selector', () => {
    it('only offers active categories of the matching type and preserves Long IDs', async () => {
        const onChange = vi.fn(); const user = userEvent.setup();
        render(<CategorySelect value="" type="EXPENSE" onChange={onChange} categories={[
            category, { ...category, id: '2', name: 'Salary', type: 'INCOME' },
            { ...category, id: '3', name: 'Inactive', active: false }, { ...category, id: '4', name: 'Food', system: true },
        ]} />);
        expect(screen.queryByRole('option', { name: /Salary|Inactive/ })).not.toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Food (System)' })).toBeInTheDocument();
        await user.selectOptions(screen.getByLabelText('Category'), '9007199254740993');
        expect(onChange).toHaveBeenCalledWith('9007199254740993');
    });
    it('offers an explicit placeholder when the matching type is empty', () => {
        render(<CategorySelect value="" type="INCOME" onChange={vi.fn()} categories={[category]} />);
        expect(screen.getAllByRole('option')).toHaveLength(1);
        expect(screen.getByRole('option')).toHaveTextContent('Select an income category');
    });
});
