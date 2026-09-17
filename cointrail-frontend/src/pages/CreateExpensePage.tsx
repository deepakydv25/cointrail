import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createExpense } from "../services/expenseService";
import type { ExpenseCategory } from "../types/expense";

function CreateExpensePage() {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<ExpenseCategory>('FOOD');
    const [description, setDescription] = useState('');
    const [expenseDate, setExpenseDate] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                        Add Expense
                    </h1>

                    <p className="mt-1 text-gray-500">
                        Record a new expense in CoinTrail.
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();

                            setError('');
                            setIsLoading(true);

                            try {
                                await createExpense({
                                    amount: Number(amount),
                                    category,
                                    description,
                                    expenseDate,
                                });

                                navigate('/expenses');
                            } catch (err) {
                                console.error(err);
                                setError('Unable to create expense.');
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                        className="space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="amount"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Amount
                            </label>

                            <input
                                id="amount"
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="category"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Category
                            </label>

                            <select
                                id="category"
                                required
                                value={category}
                                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                            >
                                <option value="">Select category</option>
                                <option value="FOOD">Food</option>
                                <option value="TRAVEL">Travel</option>
                                <option value="SHOPPING">Shopping</option>
                                <option value="ENTERTAINMENT">Entertainment</option>
                                <option value="BILLS">Bills</option>
                                <option value="HEALTH">Health</option>
                                <option value="EDUCATION">Education</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="description"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Description
                            </label>

                            <input
                                id="description"
                                type="text"
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Lunch with friends"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="expenseDate"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Expense Date
                            </label>

                            <input
                                id="expenseDate"
                                type="date"
                                required
                                value={expenseDate}
                                onChange={(e) => setExpenseDate(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            />
                        </div>

                        {error && (
                            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                {error}
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => navigate('/expenses')}
                                className="w-full cursor-pointer rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full cursor-pointer rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                                {isLoading ? 'Adding...' : 'Add Expense'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}

export default CreateExpensePage;