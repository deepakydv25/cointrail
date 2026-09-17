import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useAuth } from "../context/AuthContext";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Navbar from "./Navbar";

vi.mock("../context/AuthContext", () => ({
    useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe("Navbar", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows login and register when user is not authenticated", () => {
        mockedUseAuth.mockReturnValue({
            isAuthenticated: false,
            login: vi.fn(),
            logout: vi.fn(),
        });


        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        );

        expect(screen.getByRole("link", { name: "CoinTrail home" }))
            .toBeInTheDocument();

        expect(screen.getByText("Login"))
            .toBeInTheDocument();

        expect(screen.getByText("Register"))
            .toBeInTheDocument();

        expect(screen.queryByText("Dashboard"))
            .not.toBeInTheDocument();

        expect(screen.queryByText("Logout"))
            .not.toBeInTheDocument();
    });


    it("shows dashboard, expenses and logout when user is authenticated", () => {
        mockedUseAuth.mockReturnValue({
            isAuthenticated: true,
            login: vi.fn(),
            logout: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        );

        expect(screen.getByText("Dashboard"))
            .toBeInTheDocument();

        expect(screen.getByText("Expenses"))
            .toBeInTheDocument();

        expect(screen.getByText("Logout"))
            .toBeInTheDocument();

        expect(screen.queryByText("Login"))
            .not.toBeInTheDocument();

        expect(screen.queryByText("Register"))
            .not.toBeInTheDocument();
    });

    it("logs out and navigates to home when logout is clicked", () => {
        const logout = vi.fn();

        mockedUseAuth.mockReturnValue({
            isAuthenticated: true,
            login: vi.fn(),
            logout,
        });

        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <Routes>
                    <Route
                        path="/dashboard"
                        element={<Navbar />}
                    />

                    <Route
                        path="/"
                        element={<div>Home Page</div>}
                    />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.click(screen.getByText("Logout"));

        expect(logout).toHaveBeenCalledOnce();

        expect(
            screen.getByText("Home Page")
        ).toBeInTheDocument();
    });

    it("opens the mobile navigation menu", () => {
        mockedUseAuth.mockReturnValue({
            isAuthenticated: false,
            login: vi.fn(),
            logout: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        );


        const menuButton = screen.getByRole("button", {
            name: /toggle navigation menu/i,
        });

        fireEvent.click(menuButton);

        /*
         * Desktop + mobile versions now exist in the DOM,
         * so there should be two Login Links.
         */
        expect(
            screen.getAllByText("Login")
        ).toHaveLength(2);

        expect(
            screen.getAllByText("Register")
        ).toHaveLength(2);
    });
});