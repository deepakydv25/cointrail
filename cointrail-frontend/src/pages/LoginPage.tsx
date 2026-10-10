import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginUser } from "../services/authService";
import { useAuth } from "../context/useAuth";

import axios from 'axios';
import { normalizeApiError } from '../api/errors';
import type { ApiError } from '../api/errors';
import { FormError, FieldError } from '../components/ui/FormFeedback';
import { safeReturnPath } from '../routes/returnPath';

function LoginPage() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<ApiError | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login, sessionExpired } = useAuth();
    const location = useLocation();

    const navigate = useNavigate();

    const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

    return (
        <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-gray-50 px-4 py-8">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md sm:p-8">
                <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
                    Welcome Back
                </h1>

                <p className="mb-6 text-center text-gray-500">
                    Sign in to continue with CoinTrail.
                </p>

                {sessionExpired && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-amber-900">Your session expired. Please log in again.</p>}

                <form
                    onSubmit={async (e) => {
                        e.preventDefault();

                        setError(null);
                        setIsLoading(true);

                        try {
                            const response = await loginUser({
                                email,
                                password,
                            });

                            if (!mounted.current) return;
                            login(response.accessToken);
                            navigate(safeReturnPath(location.state?.from), { replace: true });
                        } catch (err) {
                            if (mounted.current && !axios.isCancel(err)) setError(normalizeApiError(err));
                        } finally {
                            if (mounted.current) setIsLoading(false);
                        }
                    }}
                    className="space-y-5"
                    aria-busy={isLoading}
                >
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Email
                        </label>

                        <input
                            id="email"
                            aria-invalid={!!error?.fieldErrors.email}
                            aria-describedby={error?.fieldErrors.email ? 'email-error' : undefined}
                            autoComplete="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError field="email" error={error} />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Password
                        </label>

                        <input
                            id="password"
                            aria-invalid={!!error?.fieldErrors.password}
                            aria-describedby={error?.fieldErrors.password ? 'password-error' : undefined}
                            autoComplete="current-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError field="password" error={error} />
                    </div>

                    <FormError error={error} fields={["email", "password"]} />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Don&apos;t have an account?{' '}
                    <Link
                        to="/register"
                        className="font-medium text-blue-600 hover:underline"
                    >
                        Register
                    </Link>
                </p>
            </div>

        </main>
    );
}

export default LoginPage;
