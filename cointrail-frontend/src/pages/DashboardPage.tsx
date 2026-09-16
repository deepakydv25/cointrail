import { useEffect, useState } from "react";
import type { ExpenseCategory, ExpenseSummary } from "../types/expense";
import { getExpenseSummary } from "../servcies/epenseService";
import { formatCurrency, formatCategory } from "../utils/formatters";

function DashboardPage() {

    const [summary, setSummary] = useState<ExpenseSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSummary = async () => {
            setIsLoading(true);
            setError('');

            try {
                const response = await getExpenseSummary();
                setSummary(response);
            } catch (err) {
                console.error(err);
                setError('Unable to load dashbaord.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, []);


    if (isLoading) {
        return (
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <p className="text-gray-500">
                    Loading dashbaord...
                </p>
            </main>
        );
    }

    if (error || !summary) {
        return (
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="rounded-lg bg-red-50 p-4 text-red-700">
                    {error || 'Unable to load dashboard.'}
                </div>
            </main>
        );
    }

    const categoryEntries = Object.entries(
        summary.categoryBreakdown
    ) as [ExpenseCategory, number][];

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

            {/* Heading */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                    Dashboard
                </h1>

                <p className="mt-1 text-gray-500">
                    An overview of your spending.
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <p className="text-sm font-medium text-gray-500">
                        Total Spending
                    </p>

                    <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                        {formatCurrency(summary.totalAmount)}
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <p className="text-sm font-medium text-gray-500">
                        Total Expenses
                    </p>

                    <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                        {summary.totalExpenses}
                    </p>
                </div>
            </div>

            {/* Category breakdown */}
            <section className="mt-8">
                <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Spending by Category
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        See where your money is going.
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {categoryEntries.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="font-medium text-gray-900">
                                No spending data yet
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                                Add an expense to see your spending breakdown.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {categoryEntries.map(([category, amount]) => (
                                <div
                                    key={category}
                                    className="flex items-center justify-between gap-4 p-4 sm:px-6"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {formatCategory(category)}
                                        </p>
                                    </div>

                                    <p className="shrink-0 font-semibold text-gray-900">
                                        {formatCurrency(amount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

export default DashboardPage;