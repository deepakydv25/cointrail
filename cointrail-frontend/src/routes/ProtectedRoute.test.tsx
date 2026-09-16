import { beforeEach, describe, expect, it, vi} from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import ProctectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
    useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe("ProctectedRoute", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("allows authenticated user to access protected route", () => {
        mockedUseAuth.mockReturnValue({
            isAuthenticated: true,
            login: vi.fn(),
            logout: vi.fn(),
        });

        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <Routes>
                    <Route element={<ProctectedRoute/>}>
                        <Route 
                            path="/dashboard"
                            element={<div>Dashboard Page</div>}
                        />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(
            screen.getByText("Dashboard Page")
        ).toBeInTheDocument();
    });

    it("redirects unauthenticated user to login", () => {

        mockedUseAuth.mockReturnValue({
            isAuthenticated: false,
            login: vi.fn(),
            logout: vi.fn(),
        });

        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <Routes>
                    <Route element={<ProctectedRoute/>}>
                        <Route 
                            path="/dashboard"
                            element={<div>Dashboard Page</div>}
                        />
                    </Route>

                    <Route 
                        path="/login"
                        element={<div>Login Page</div>}
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(
            screen.getByText("Login Page")
        ).toBeInTheDocument();

        expect(
            screen.queryByText("Dashboard Page")
        ).not.toBeInTheDocument();
    });
});


