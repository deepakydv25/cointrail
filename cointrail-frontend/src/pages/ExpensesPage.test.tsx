import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import ExpensesPage from "./ExpensesPage";
import { getExpenses } from "../services/expenseService";

vi.mock("../servcies/epenseService");

const mockedGetExpenses = vi.mocked(getExpenses);

const expensePage = {
    content: [
        {
            id: 1,
            amount: 500,
            category: "FOOD" as const,
            description: "Dinner",
            expenseDate: "2026-09-15",
            createdAt: "2026-09-15T20:00:00",
            updatedAt: "2026-09-15T20:00:00",
        },
        {
            id: 2,
            amount: 1200,
            category: "TRAVEL" as const,
            description: "Cab",
            expenseDate: "2026-09-14",
            createdAt: "2026-09-14T10:00:00",
            updatedAt: "2026-09-14T10:00:00",
        },
    ],
    totalElements: 7,
    totalPages: 2,
    size: 5,
    number: 0,
};

describe("ExpensesPage", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("loads and displays expenses", async () => {
        mockedGetExpenses.mockResolvedValue(expensePage);

        render(
            <MemoryRouter>
                <ExpensesPage />
            </MemoryRouter>
        );

        expect(
            screen.getByText("Loading expenses...")
        ).toBeInTheDocument();

        expect(
            await screen.findByText("Dinner")
        ).toBeInTheDocument();

        expect(
            screen.getByText("Cab")
        ).toBeInTheDocument();

        expect(mockedGetExpenses).toHaveBeenCalledWith(
            0,
            5,
            "expenseDate",
            "desc",
            ""
        );

        expect(
            screen.getByText(/Page 1 of 2/)
        ).toBeInTheDocument();
    });

    it("filters expenses by category", async () => {
        const user = userEvent.setup();

        mockedGetExpenses.mockResolvedValue(expensePage);

        render(
            <MemoryRouter>
                <ExpensesPage />
            </MemoryRouter>
        );

        await screen.findByText("Dinner");

        await user.selectOptions(
            screen.getByLabelText("Category"),
            "FOOD"
        );

        expect(mockedGetExpenses).toHaveBeenLastCalledWith(
            0,
            5,
            "expenseDate",
            "desc",
            "FOOD"
        );
    });

    it("changes expense sorting", async () => {
        const user = userEvent.setup();

        mockedGetExpenses.mockResolvedValue(expensePage);

        render(
            <MemoryRouter>
                <ExpensesPage />
            </MemoryRouter>
        );

        await screen.findByText("Dinner");

        await user.selectOptions(
            screen.getByLabelText("Sort By"),
            "amount"
        );

        expect(mockedGetExpenses).toHaveBeenLastCalledWith(
            0,
            5,
            "amount",
            "desc",
            ""
        );

        await user.selectOptions(
            screen.getByLabelText("Order"),
            "asc"
        );

        expect(mockedGetExpenses).toHaveBeenLastCalledWith(
            0,
            5,
            "amount",
            "asc",
            ""
        );
    });

    it("loads the next page", async () => {
        const user = userEvent.setup();

        mockedGetExpenses.mockResolvedValue(expensePage);

        render(
            <MemoryRouter>
                <ExpensesPage />
            </MemoryRouter>
        );

        await screen.findByText("Dinner");

        await user.click(
            screen.getByRole("button", {
                name: /next/i,
            })
        );

        expect(mockedGetExpenses).toHaveBeenLastCalledWith(
            1,
            5,
            "expenseDate",
            "desc",
            ""
        );
    });

    it("shows error when expenses cannot be loaded", async () => {
        mockedGetExpenses.mockRejectedValue(
            new Error("Request failed")
        );

        render(
            <MemoryRouter>
                <ExpensesPage />
            </MemoryRouter>
        );

        expect(
            await screen.findByText(
                "Unable to load expenses."
            )
        ).toBeInTheDocument();
    });
});