import { useEffect, useState } from "react";
import type { Expense } from "../types/expense";
import { getExpenses } from "../servcies/epenseService";
import { Link } from "react-router-dom";
import { formatCurrency, formatDate } from "../utils/formatters";

function ExpensesPage() {

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [sortBy, setSortBy] = useState('expenseDate');
    const [direction, setDirection] = useState('desc');
    const [category, setCategory] = useState('');

    const pageSize = 5;

    useEffect(() => {
        const fetchExpense = async () => {
            setIsLoading(true);
            setError('');

            try {
                const response = await getExpenses(
                    currentPage,
                    pageSize,
                    sortBy,
                    direction,
                    category
                );

                setExpenses(response.content);
                setTotalPages(response.totalPages);
                setTotalElements(response.totalElements);
            } catch (err) {
                console.error(err);
                setError('Unable to load expenses.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchExpense();
    }, [currentPage, sortBy, direction, category]);

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <p className="text-gray-500">Loading expenses...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <p className="rounded-lg bg-red-50 p-4 text-red-700">
                    {error}
                </p>
            </div>
        );
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                        Expenses
                    </h1>

                    <p className="mt-1 text-gray-500">
                        Track and manage your expenses.
                    </p>
                </div>

                <Link
                    to="/expenses/create"
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white transition hover:bg-blue-700 sm:w-auto"
                >
                    + Add Expense
                </Link>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">

                    <div className="flex-1">
                        <label
                            htmlFor="category"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Category
                        </label>

                        <select
                            id="category"
                            value={category}
                            onChange={(e) => {
                                setCategory(e.target.value);
                                setCurrentPage(0);
                            }}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500"
                        >
                            <option value="">All Categories</option>
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

                    <div className="flex-1">
                        <label
                            htmlFor="sortBy"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Sort By
                        </label>

                        <select
                            id="sortBy"
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setCurrentPage(0);
                            }}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500"
                        >
                            <option value="expenseDate">Expense Date</option>
                            <option value="amount">Amount</option>
                        </select>
                    </div>

                    <div className="flex-1">
                        <label
                            htmlFor="direction"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Order
                        </label>

                        <select
                            id="direction"
                            value={direction}
                            onChange={(e) => {
                                setDirection(e.target.value);
                                setCurrentPage(0);
                            }}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500"
                        >
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                </div>

            </div>
        

            {expenses.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {category ? 'No expenses found' : 'No expenses yet'}
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        {category
                            ? `You don't have any expenses in the ${category.toLowerCase()} category`
                            : 'Add your first expense to start tracking your spending.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {expenses.map((expense) => (
                        <div
                            key={expense.id}
                            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900">
                                        {expense.description}
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {expense.category} • {formatDate(expense.expenseDate)}
                                    </p>
                                </div>

                                <p className="shrink-0 font-semibold text-gray-900">
                                    {formatCurrency(expense.amount)}
                                </p>
                            </div>

                            <div className="mt-4 border-t border-gray-100 pt-3">
                                <Link
                                    to={`/expenses/${expense.id}`}
                                    className="text-sm font-medium text-blue-600 hover:underline"
                                >
                                    View details
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 sm:flex-row">
                    <p className="text-sm text-gray-500">
                        Page {currentPage + 1} of {totalPages}
                        {' '}• {totalElements} expenses
                    </p>

                    <div className="flex w-full gap-3 sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((page) => page-1)}
                            disabled={currentPage === 0}
                            className="flex-1 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                            ← Previous
                        </button>

                        <button
                            type="button"
                            onClick={() => setCurrentPage((page) => page+1)}
                            disabled={currentPage >= totalPages-1}
                            className="flex-1 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </main>
    ); 
}

export default ExpensesPage;