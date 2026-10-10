import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { registerUser } from "../services/authService";

import axios from 'axios';
import { normalizeApiError } from '../api/errors';
import type { ApiError } from '../api/errors';
import { FormError, FieldError } from '../components/ui/FormFeedback';

function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState<ApiError | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

    return (
        <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
                <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
                    Create Account
                </h1>

                <p className="mb-6 text-center text-gray-600">
                    Create your account to organize your financial activity.
                </p>

                <form
                    onSubmit={async (e) => {
                        e.preventDefault();

                        setMessage('');
                        setError(null);
                        setIsLoading(true);

                        try {
                            await registerUser({
                                name,
                                email,
                                password,
                            });

                            if (!mounted.current) return;
                            setMessage('Registration successful.');

                            setName('');
                            setEmail('');
                            setPassword('');
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
                            htmlFor="name"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Name
                        </label>
                        <input
                            id="name"
                            aria-invalid={!!error?.fieldErrors.name}
                            aria-describedby={error?.fieldErrors.name ? 'name-error' : undefined}
                            autoComplete="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError field="name" error={error} />
                    </div>

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
                            autoComplete="new-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError field="password" error={error} />
                    </div>

                    {message && (
                        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                            {message}
                        </p>
                    )}

                    <FormError error={error} fields={["name", "email", "password"]} />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link
                        to="/login"
                        className="font-medium text-blue-600 hover:underline"
                    >
                        Login
                    </Link>
                </p>

            </div>

        </main>
    );
}

export default RegisterPage;
