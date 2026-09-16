import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import LoginPage from "./LoginPage";
import { loginUser } from "../servcies/authService";
import { useAuth } from "../context/AuthContext";

vi.mock("../servcies/authService");
vi.mock("../context/AuthContext");

const mockedLoginUser = vi.mocked(loginUser);
const mockedUseAuth = vi.mocked(useAuth);

describe("LoginPage", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the login form", () => {
        mockedUseAuth.mockReturnValue({
            isAuthenticated: false,
            login: vi.fn(),
            logout: vi.fn(),
        });

        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        expect(
            screen.getByRole("heading", {
                name: /welcome back/i,
            })
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Email")
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Password")
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", {
                name: "Login",
            })
        ).toBeInTheDocument();
    });

    it("logs in successfully and navigates to dashboard", async () => {
        const user = userEvent.setup();
        const login = vi.fn();

        mockedUseAuth.mockReturnValue({
            isAuthenticated: false,
            login,
            logout: vi.fn(),
        });

        mockedLoginUser.mockResolvedValue({
            accessToken: "test-jwt-token",
            tokenType: "Bearer",
        });

        render(
            <MemoryRouter initialEntries={["/login"]}>
                <Routes>
                    <Route
                        path="/login"
                        element={<LoginPage />}
                    />

                    <Route
                        path="/dashboard"
                        element={<div>Dashboard Page</div>}
                    />
                </Routes>
            </MemoryRouter>
        );

        await user.type(
            screen.getByLabelText("Email"),
            "deepak@example.com"
        );

        await user.type(
            screen.getByLabelText("Password"),
            "password123"
        );

        await user.click(
            screen.getByRole("button", {
                name: "Login",
            })
        );

        expect(mockedLoginUser).toHaveBeenCalledWith({
            email: "deepak@example.com",
            password: "password123",
        });

        expect(login).toHaveBeenCalledWith(
            "test-jwt-token"
        );

        expect(
            await screen.findByText("Dashboard Page")
        ).toBeInTheDocument();
    });

    it("shows error when login fails", async () => {
        const user = userEvent.setup();
        const login = vi.fn();

        mockedUseAuth.mockReturnValue({
            isAuthenticated: false,
            login,
            logout: vi.fn(),
        });

        mockedLoginUser.mockRejectedValue(
            new Error("Invalid credentials")
        );

        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        await user.type(
            screen.getByLabelText("Email"),
            "wrong@example.com"
        );

        await user.type(
            screen.getByLabelText("Password"),
            "wrongpassword"
        );

        await user.click(
            screen.getByRole("button", {
                name: "Login",
            })
        );

        expect(
            await screen.findByText(
                "Invalid email or password"
            )
        ).toBeInTheDocument();

        expect(mockedLoginUser).toHaveBeenCalledWith({
            email: "wrong@example.com",
            password: "wrongpassword",
        });

        expect(login).not.toHaveBeenCalled();
    });
});