import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import RegisterPage from "./RegisterPage";
import { registerUser } from "../servcies/authService";

vi.mock("../servcies/authService");

const mockedRegisterUser = vi.mocked(registerUser);

describe("RegisterPage", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the registration form", () => {
        render(
            <MemoryRouter>
                <RegisterPage />
            </MemoryRouter>
        );

        expect(
            screen.getByRole("heading", {
                name: /create account/i,
            })
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Name")
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Email")
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Password")
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", {
                name: "Register",
            })
        ).toBeInTheDocument();
    });

    it("registers user successfully", async () => {
        const user = userEvent.setup();

        mockedRegisterUser.mockResolvedValue({});

        render(
            <MemoryRouter>
                <RegisterPage />
            </MemoryRouter>
        );

        await user.type(
            screen.getByLabelText("Name"),
            "Deepak Yadav"
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
                name: "Register",
            })
        );

        expect(mockedRegisterUser).toHaveBeenCalledWith({
            name: "Deepak Yadav",
            email: "deepak@example.com",
            password: "password123",
        });

        expect(
            await screen.findByText("Registration successful.")
        ).toBeInTheDocument();
    });

    it("clears the form after successful registration", async () => {
        const user = userEvent.setup();

        mockedRegisterUser.mockResolvedValue({});

        render(
            <MemoryRouter>
                <RegisterPage />
            </MemoryRouter>
        );

        const nameInput = screen.getByLabelText("Name");
        const emailInput = screen.getByLabelText("Email");
        const passwordInput = screen.getByLabelText("Password");

        await user.type(nameInput, "Deepak Yadav");
        await user.type(emailInput, "deepak@example.com");
        await user.type(passwordInput, "password123");

        await user.click(
            screen.getByRole("button", {
                name: "Register",
            })
        );

        await screen.findByText("Registration successful.");

        expect(nameInput).toHaveValue("");
        expect(emailInput).toHaveValue("");
        expect(passwordInput).toHaveValue("");
    });

    it("shows error when registration fails", async () => {
        const user = userEvent.setup();

        mockedRegisterUser.mockRejectedValue(
            new Error("Registration failed")
        );

        render(
            <MemoryRouter>
                <RegisterPage />
            </MemoryRouter>
        );

        await user.type(
            screen.getByLabelText("Name"),
            "Deepak Yadav"
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
                name: "Register",
            })
        );

        expect(
            await screen.findByText("Registration failed.")
        ).toBeInTheDocument();

        expect(mockedRegisterUser).toHaveBeenCalledWith({
            name: "Deepak Yadav",
            email: "deepak@example.com",
            password: "password123",
        });
    });
});