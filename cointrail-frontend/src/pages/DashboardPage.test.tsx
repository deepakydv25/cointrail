import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import DashboardPage from "./DashboardPage";
import {
    getExpenses,
    getExpenseSummary,
} from "../services/expenseService";

vi.mock("../servcies/epenseService");

vi.mock("../components/CategorySpendingChart", () => ({
    default: () => <div>Category Spending Chart</div>,
}));

const mockedGetExpenseSummary = vi.mocked(getExpenseSummary);
const mockedGetExpenses = vi.mocked(getExpenses);

const summary = {
    totalAmount: 3500,
    totalExpenses: 3,
    categoryBreakdown: {
        FOOD: 1500,
        TRAVEL: 2000,
    },
};

const expensesPage = {
    content: [
        {
            id: 1,
            amount: 500,
            category: "FOOD" as const,
            description: "Dinner",
            expenseDate: "2026-09-16",
            createdAt: "2026-09-16T20:00:00",
            updatedAt: "2026-09-16T20:00:00",
        },
        {
            id: 2,
            amount: 1000,
            category: "TRAVEL" as const,
            description: "Cab",
            expenseDate: "2026-09-15",
            createdAt: "2026-09-15T18:00:00",
            updatedAt: "2026-09-15T18:00:00",
        },
    ],
    totalElements: 2,
    totalPages: 1,
    size: 5,
    number: 0,
};

describe("DashboardPage", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("loads and displays dashboard summary", async () => {
        mockedGetExpenseSummary.mockResolvedValue(summary);
        mockedGetExpenses.mockResolvedValue(expensesPage);

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        expect(
            screen.getByText("Loading dashboard...")
        ).toBeInTheDocument();

        expect(
            await screen.findByRole("heading", {
                name: "Dashboard",
            })
        ).toBeInTheDocument();

        expect(
            screen.getByText("Total Spending")
        ).toBeInTheDocument();

        expect(
            screen.getByText("₹3,500.00")
        ).toBeInTheDocument();

        expect(
            screen.getByText("Total Expenses")
        ).toBeInTheDocument();

        expect(
            screen.getByText("3")
        ).toBeInTheDocument();
    });

    it("loads summary and five recent expenses", async () => {
        mockedGetExpenseSummary.mockResolvedValue(summary);
        mockedGetExpenses.mockResolvedValue(expensesPage);

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        await screen.findByRole("heading", {
            name: "Dashboard",
        });

        expect(
            mockedGetExpenseSummary
        ).toHaveBeenCalledOnce();

        expect(
            mockedGetExpenses
        ).toHaveBeenCalledWith(
            0,
            5,
            "expenseDate",
            "desc"
        );
    });

    it("displays category breakdown and chart", async () => {
        mockedGetExpenseSummary.mockResolvedValue(summary);
        mockedGetExpenses.mockResolvedValue(expensesPage);

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        await screen.findByRole("heading", {
            name: "Dashboard",
        });

        expect(
            screen.getByText("Spending by Category")
        ).toBeInTheDocument();

        expect(
            screen.getByText("Food")
        ).toBeInTheDocument();

        expect(
            screen.getByText("₹1,500.00")
        ).toBeInTheDocument();

        expect(
            screen.getByText("Travel")
        ).toBeInTheDocument();

        expect(
            screen.getByText("₹2,000.00")
        ).toBeInTheDocument();

        expect(
            screen.getByText("Category Spending Chart")
        ).toBeInTheDocument();
    });

    it("displays recent expenses", async () => {
        mockedGetExpenseSummary.mockResolvedValue(summary);
        mockedGetExpenses.mockResolvedValue(expensesPage);

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        expect(
            await screen.findByText("Dinner")
        ).toBeInTheDocument();

        expect(
            screen.getByText("Cab")
        ).toBeInTheDocument();

        expect(
            screen.getByRole("link", {
                name: /view all/i,
            })
        ).toHaveAttribute(
            "href",
            "/expenses"
        );

        expect(
            screen.getByRole("link", {
                name: /dinner/i,
            })
        ).toHaveAttribute(
            "href",
            "/expenses/1"
        );
    });

    it("shows empty states when user has no expenses", async () => {
        mockedGetExpenseSummary.mockResolvedValue({
            totalAmount: 0,
            totalExpenses: 0,
            categoryBreakdown: {},
        });

        mockedGetExpenses.mockResolvedValue({
            ...expensesPage,
            content: [],
            totalElements: 0,
            totalPages: 0,
        });

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        expect(
            await screen.findByText("No spending data yet")
        ).toBeInTheDocument();

        expect(
            screen.getByText("No expenses yet")
        ).toBeInTheDocument();

        expect(
            screen.queryByText("Category Spending Chart")
        ).not.toBeInTheDocument();
    });

    it("shows error when dashboard cannot be loaded", async () => {
        mockedGetExpenseSummary.mockRejectedValue(
            new Error("Request failed")
        );

        mockedGetExpenses.mockResolvedValue(expensesPage);

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        expect(
            await screen.findByText(
                "Unable to load dashboard."
            )
        ).toBeInTheDocument();
    });
});