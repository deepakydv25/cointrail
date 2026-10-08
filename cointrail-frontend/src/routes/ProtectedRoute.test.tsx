import { beforeEach, describe, expect, it, vi} from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import ProctectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/useAuth";

vi.mock("../context/useAuth", () => ({
    useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe("ProctectedRoute", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("does not render protected content while the session is initializing", () => {
        mockedUseAuth.mockReturnValue({
            isAuthenticated: true, isInitialized: false, sessionExpired: false, sessionVersion: 0,
            login: vi.fn(), logout: vi.fn(),
        });
        render(<MemoryRouter initialEntries={["/dashboard"]}><Routes>
            <Route element={<ProctectedRoute />}>
                <Route path="/dashboard" element={<div>Private content</div>} />
            </Route>
        </Routes></MemoryRouter>);
        expect(screen.getByRole("status")).toHaveTextContent("Checking session");
        expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    });

    it("allows authenticated user to access protected route", () => {
        mockedUseAuth.mockReturnValue({
            isAuthenticated: true,
            isInitialized: true, sessionExpired: false, sessionVersion: 0,
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
            isInitialized: true, sessionExpired: false, sessionVersion: 0,
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


