import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useAuth } from "../context/useAuth";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Navbar from "./Navbar";

vi.mock("../context/useAuth", () => ({
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
            isInitialized: true, sessionExpired: false, sessionVersion: 0,
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
        expect(screen.getByRole('link', { name: 'CoinTrail home' })).toHaveTextContent(/^CoinTrail$/);
        expect(screen.queryByText('Spend with intention')).not.toBeInTheDocument();
        expect(screen.getByRole('navigation')).toHaveClass('ct-public-header-container');
        expect(screen.getByRole('banner')).toHaveClass('ct-public-header', 'ct-glass-header');
        expect(screen.queryByRole('button', { name: /toggle navigation menu/i })).not.toBeInTheDocument();

        expect(screen.getByText("Login"))
            .toBeInTheDocument();

        expect(screen.getByText("Register"))
            .toBeInTheDocument();

        expect(screen.queryByText("Legacy Overview"))
            .not.toBeInTheDocument();

        expect(screen.queryByText("Logout"))
            .not.toBeInTheDocument();
    });


    it("shows dashboard, expenses and logout when user is authenticated", () => {
        mockedUseAuth.mockReturnValue({
            isAuthenticated: true,
            isInitialized: true, sessionExpired: false, sessionVersion: 0,
            login: vi.fn(),
            logout: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        );

        expect(screen.getByText("Legacy Overview"))
            .toBeInTheDocument();

        expect(screen.getByText("Legacy Expenses"))
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
            isInitialized: true, sessionExpired: false, sessionVersion: 0,
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
            isAuthenticated: true,
            isInitialized: true, sessionExpired: false, sessionVersion: 0,
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

        expect(menuButton).toHaveAttribute("aria-expanded", "true");
        expect(menuButton).toHaveAttribute("aria-controls", "primary-navigation");
        expect(
            screen.getAllByText("Accounts")
        ).toHaveLength(1);

        expect(
            screen.getAllByText("Categories")
        ).toHaveLength(1);

        fireEvent.keyDown(menuButton, { key: "Escape" });
        expect(menuButton).toHaveAttribute("aria-expanded", "false");
        expect(menuButton).toHaveFocus();
    });
});
