import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PublicRoute from "./PublicRoute";
import { useAuth } from "../context/useAuth";

vi.mock("../context/useAuth", () => ({
    useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe("PublicRoute", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("allows unathenticated user to access public route", () => {

        mockedUseAuth.mockReturnValue({
            isAuthenticated: false,
            isInitialized: true, sessionExpired: false, sessionVersion: 0,
            login: vi.fn(),
            logout: vi.fn(),
        });

        render(
            <MemoryRouter initialEntries={["/login"]}>
                <Routes>
                    <Route element={<PublicRoute/>}>
                        <Route 
                            path="/login"
                            element={<div>Login Page</div>}
                        />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(
            screen.getByText("Login Page")
        ).toBeInTheDocument();
    });

    it("redirects authenticate user to daashboard", () => {

        mockedUseAuth.mockReturnValue({
            isAuthenticated: true,
            isInitialized: true, sessionExpired: false, sessionVersion: 0,
            login: vi.fn(),
            logout: vi.fn(),
        });

        render(
            <MemoryRouter initialEntries={["/login"]}>
                <Routes>
                    <Route element={<PublicRoute />}>
                        <Route 
                            path="/login"
                            element={<div>Login Page</div>}
                        />
                    </Route>

                    <Route 
                        path="/dashboard"
                        element={<div>Dashboard Page</div>}
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(
            screen.getByText("Dashboard Page")
        ).toBeInTheDocument();

        expect(
            screen.queryByText("Login Page")
        ).not.toBeInTheDocument();
    });
});
