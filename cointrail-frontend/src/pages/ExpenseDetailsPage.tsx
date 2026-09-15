import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Expense } from "../types/expense";
import { getExpenseById } from "../servcies/epenseService";

function ExpenseDetailsPage() {
    const { id } = useParams();

    const [expense, setExpense] = useState<Expense | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchExpense = async () => {
            if (!id) {
                setError('Invalid expense.');
                setIsLoading(false);
                return;
            }

            try {
                const response = await getExpenseById(Number(id));
                setExpense(response);
            } catch (err) {
                console.error(err);
                setError('Unable to load expenese.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchExpense();
    }, [id]);

    if (isLoading) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                <p className="text-gray-500">Loading expense...</p>
            </main>
        );
    }

    if (error || !expense) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                <div className="rounded-lg bg-red-50 p-4 text-red-700">
                    {error || 'Expense not found.'}
                </div>

                <Link
                    to="/expenses"
                    className="mt-4 inline-block text-blue-600 hover:underline"
                >
                    ← Back to expenses
                </Link>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <div className="mb-6">
                <Link
                    to="/expenses"
                    className="text-sm font-medium text-blue-600 hover:underline"
                >
                    ← Back to expenses
                </Link>

                <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
                    Expense Details
                </h1>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
                <div className="border-b border-gray-200 pb-5">
                    <p className="text-sm text-gray-500">
                        Amount
                    </p>

                    <p className="mt-1 text-3xl font-bold text-gray-900">
                        ₹{expense.amount}
                    </p>
                </div>

                <div className="mt-6 grid gird-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <p className="text-sm text-gray-500">
                            Description
                        </p>
                        <p className="mt-1 font-medium text-gray-900">
                            {expense.description}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Category
                        </p>
                        <p className="mt-1 font-medium text-gray-900">
                            {expense.category}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Expnese Date
                        </p>
                        <p className="mt-1 font-medium text-gray-900">
                            {expense.expenseDate}
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default ExpenseDetailsPage;