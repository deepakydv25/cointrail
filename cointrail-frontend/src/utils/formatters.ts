import type { ExpenseCategory } from "../types/expense";

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
};

export const formatDate = (date: string): string => {
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00Z`));
};

export const formatCategory = (category: ExpenseCategory): string => {
    return category.charAt(0) + category.slice(1).toLowerCase();
};