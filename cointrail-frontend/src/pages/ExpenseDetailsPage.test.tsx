import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ExpenseDetailsPage from './ExpenseDetailsPage';
import { deleteExpense, getExpenseById } from '../services/expenseService';

vi.mock('../services/expenseService');
const expense = { id: 7, amount: 12.34, category: 'FOOD' as const, description: 'Legacy lunch', expenseDate: '2026-10-01', createdAt: '', updatedAt: '' };
const showDetails = () => render(<MemoryRouter initialEntries={['/expenses/7']}><Routes>
    <Route path="/expenses/:id" element={<ExpenseDetailsPage />} />
    <Route path="/expenses" element={<h1>Expense list</h1>} />
</Routes></MemoryRouter>);
beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.mocked(getExpenseById).mockResolvedValue(expense); });

describe('legacy expense details and deletion', () => {
    it('reads the ID and retains INR display and the edit route', async () => {
        showDetails(); await screen.findByText('Legacy lunch');
        expect(getExpenseById).toHaveBeenCalledWith(7);
        expect(screen.getByText('₹12.34')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Edit Expense' })).toHaveAttribute('href', '/expenses/7/edit');
    });
    it('does not delete when confirmation is canceled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false); const user = userEvent.setup();
        showDetails(); await screen.findByText('Legacy lunch');
        await user.click(screen.getByRole('button', { name: 'Delete Expense' }));
        expect(deleteExpense).not.toHaveBeenCalled();
    });
    it('deletes only the selected legacy record and returns to the list', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true); vi.mocked(deleteExpense).mockResolvedValue();
        const user = userEvent.setup(); showDetails(); await screen.findByText('Legacy lunch');
        await user.click(screen.getByRole('button', { name: 'Delete Expense' }));
        expect(deleteExpense).toHaveBeenCalledWith(7);
        expect(await screen.findByRole('heading', { name: 'Expense list' })).toBeInTheDocument();
    });
    it('retains details when deletion fails', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true); vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(deleteExpense).mockRejectedValue(new Error('Request failed'));
        const user = userEvent.setup(); showDetails(); await screen.findByText('Legacy lunch');
        await user.click(screen.getByRole('button', { name: 'Delete Expense' }));
        expect(await screen.findByText('Unable to delete expense.')).toBeInTheDocument();
        expect(screen.getByText('Legacy lunch')).toBeInTheDocument();
    });
});
