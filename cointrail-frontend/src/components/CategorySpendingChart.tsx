import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ExpenseCategory } from "../types/expense";

import { formatCategory, formatCurrency } from "../utils/formatters";

interface CategorySpendingChartProps {
    categoryBreakdown: Partial<Record<ExpenseCategory, number>>;
}

const COLORS = [
    '#2563eb',
    '#16a34a',
    '#f59e0b',
    '#dc2626',
    '#9333ea',
    '#0891b2',
    '#ea580c',
    '#4b5563',
];

function CategorySpendingChart({
    categoryBreakdown
}: CategorySpendingChartProps) {
    const data = Object.entries(categoryBreakdown).map(
        ([category, amount], index) => ({
            name: formatCategory(category as ExpenseCategory),
            value: amount,
            fill: COLORS[index % COLORS.length],
        })
    );

    if (data.length === 0) {
        return (
            <div className="flex h-72 items-center justify-center">
                <p className="text-sm text-gray-500">
                    No spending data available.
                </p>
            </div>
        );
    }

    return (
        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={2}  
                    />
                    <Tooltip
                        formatter={(value) => formatCurrency(Number(value))} 
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export default CategorySpendingChart;