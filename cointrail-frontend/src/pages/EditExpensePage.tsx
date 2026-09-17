import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExpenseById, updateExpense } from "../services/expenseService";
import type { ExpenseCategory } from "../types/expense";

function EditExpensePage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<ExpenseCategory>('FOOD');
    const [description, setDescription] = useState('');
    const [expenseDate, setExpenseDate] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchExpense = async () => {
            if (!id) {
                setError('Invalid expense.');
                setIsLoading(false);
                return;
            }

            try {
                const expense = await getExpenseById(Number(id));

                setAmount(String(expense.amount));
                setCategory(expense.category);
                setDescription(expense.description);
                setExpenseDate(expense.expenseDate);
            } catch (err) {
                console.error(err);
                setError('Unable to load expense.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchExpense();
    }, [id]);

    if (isLoading) {
        return (
            <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
                <p className="text-gray-500">
                    Loading expense...
                </p>
            </main>
        );
    }

    if (error && !amount) {
        return (
            <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
                <p className="rounded-lg bg-red-50 p-4 text-red-700">
                    {error}
                </p>
            </main>
        );
    }


    return (
        <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                    Edit Expense
                </h1>

                <p className="mt-1 text-gray-500">
                    Update your expense information.
                </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">

                <form
                    onSubmit={async (e) => {
                        e.preventDefault();

                        if (!id) {
                            return;
                        }

                        setError('');
                        setIsSaving(true);

                        try {
                            await updateExpense(Number(id), {
                                amount: Number(amount),
                                category,
                                description,
                                expenseDate,
                            });

                            navigate(`/expenses/${id}`);
                        } catch (err) {
                            console.error(err);
                            setError('Unable to update expense.');
                        } finally {
                            setIsSaving(false);
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
                            onClick={() => navigate(`/expenses/${id}`)}
                            className="w-full rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

export default EditExpensePage;