import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditExpensePage from './EditExpensePage';
import { getExpenseById, updateExpense } from '../services/expenseService';

vi.mock('../services/expenseService');
const expense = { id: 7, amount: 12.34, category: 'FOOD' as const, description: 'Legacy lunch', expenseDate: '2026-10-01', createdAt: '', updatedAt: '' };
const showEdit = () => render(<MemoryRouter initialEntries={['/expenses/7/edit']}><Routes>
    <Route path="/expenses/:id/edit" element={<EditExpensePage />} />
    <Route path="/expenses/:id" element={<h1>Expense details</h1>} />
</Routes></MemoryRouter>);
beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.mocked(getExpenseById).mockResolvedValue(expense); });

describe('legacy expense editing', () => {
    it('loads and replaces only the selected V1 record with the existing payload', async () => {
        vi.mocked(updateExpense).mockResolvedValue({ ...expense, amount: 15 });
        const user = userEvent.setup(); showEdit(); await screen.findByLabelText('Amount');
        expect(screen.getByLabelText('Expense Date')).toHaveValue('2026-10-01');
        await user.clear(screen.getByLabelText('Amount')); await user.type(screen.getByLabelText('Amount'), '15');
        await user.click(screen.getByRole('button', { name: 'Save Changes' }));
        expect(updateExpense).toHaveBeenCalledWith(7, { amount: 15, category: 'FOOD', description: 'Legacy lunch', expenseDate: '2026-10-01' });
        expect(await screen.findByRole('heading', { name: 'Expense details' })).toBeInTheDocument();
    });
    it('keeps inputs after a failed update', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {}); vi.mocked(updateExpense).mockRejectedValue(new Error('Request failed'));
        const user = userEvent.setup(); showEdit(); await screen.findByLabelText('Amount');
        await user.click(screen.getByRole('button', { name: 'Save Changes' }));
        expect(await screen.findByText('Unable to update expense.')).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toHaveValue('Legacy lunch');
    });
    it('returns to detail without writing when canceled', async () => {
        const user = userEvent.setup(); showEdit(); await screen.findByLabelText('Amount');
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(updateExpense).not.toHaveBeenCalled();
        expect(await screen.findByRole('heading', { name: 'Expense details' })).toBeInTheDocument();
    });
});
