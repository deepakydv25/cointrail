import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import CreateExpensePage from "./CreateExpensePage";
import { createExpense } from "../services/expenseService";

vi.mock("../services/expenseService");

const mockedCreateExpense = vi.mocked(createExpense);

describe("CreateExpensePage", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the create expense form", () => {
        render(
            <MemoryRouter>
                <CreateExpensePage />
            </MemoryRouter>
        );

        expect(
            screen.getByRole("heading", {
                name: /add expense/i,
            })
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Amount")
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Category")
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Description")
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Expense Date")
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", {
                name: "Add Expense",
            })
        ).toBeInTheDocument();
    });

    it("creates an expense and navigates to expenses page", async () => {
        const user = userEvent.setup();

        mockedCreateExpense.mockResolvedValue({
            id: 1,
            amount: 500,
            category: "FOOD",
            description: "Dinner",
            expenseDate: "2026-09-16",
            createdAt: "2026-09-16T20:00:00",
            updatedAt: "2026-09-16T20:00:00",
        });

        render(
            <MemoryRouter initialEntries={["/expenses/create"]}>
                <Routes>
                    <Route
                        path="/expenses/create"
                        element={<CreateExpensePage />}
                    />

                    <Route
                        path="/expenses"
                        element={<div>Expenses Page</div>}
                    />
                </Routes>
            </MemoryRouter>
        );

        await user.type(
            screen.getByLabelText("Amount"),
            "500"
        );

        await user.selectOptions(
            screen.getByLabelText("Category"),
            "FOOD"
        );

        await user.type(
            screen.getByLabelText("Description"),
            "Dinner"
        );

        await user.type(
            screen.getByLabelText("Expense Date"),
            "2026-09-16"
        );

        await user.click(
            screen.getByRole("button", {
                name: "Add Expense",
            })
        );

        expect(mockedCreateExpense).toHaveBeenCalledWith({
            amount: 500,
            category: "FOOD",
            description: "Dinner",
            expenseDate: "2026-09-16",
        });

        expect(
            await screen.findByText("Expenses Page")
        ).toBeInTheDocument();
    });

    it("shows error when expense creation fails", async () => {
        const user = userEvent.setup();

        mockedCreateExpense.mockRejectedValue(
            new Error("Request failed")
        );

        render(
            <MemoryRouter>
                <CreateExpensePage />
            </MemoryRouter>
        );

        await user.type(
            screen.getByLabelText("Amount"),
            "500"
        );

        await user.selectOptions(
            screen.getByLabelText("Category"),
            "FOOD"
        );

        await user.type(
            screen.getByLabelText("Description"),
            "Dinner"
        );

        await user.type(
            screen.getByLabelText("Expense Date"),
            "2026-09-16"
        );

        await user.click(
            screen.getByRole("button", {
                name: "Add Expense",
            })
        );

        expect(
            await screen.findByText(
                "Unable to create expense."
            )
        ).toBeInTheDocument();

        expect(mockedCreateExpense).toHaveBeenCalledWith({
            amount: 500,
            category: "FOOD",
            description: "Dinner",
            expenseDate: "2026-09-16",
        });
    });

    it("navigates back to expenses when cancel is clicked", async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter initialEntries={["/expenses/create"]}>
                <Routes>
                    <Route
                        path="/expenses/create"
                        element={<CreateExpensePage />}
                    />

                    <Route
                        path="/expenses"
                        element={<div>Expenses Page</div>}
                    />
                </Routes>
            </MemoryRouter>
        );

        await user.click(
            screen.getByRole("button", {
                name: "Cancel",
            })
        );

        expect(
            await screen.findByText("Expenses Page")
        ).toBeInTheDocument();

        expect(mockedCreateExpense).not.toHaveBeenCalled();
    });
});