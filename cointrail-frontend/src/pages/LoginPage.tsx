import { useState } from "react";
import { Link } from "react-router-dom";

function LoginPage() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-gray-50 px-4 py-8">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md sm:p-8">
                <h1 className="mb-2 text-center text-3xl fond-bold text-gray-900">
                    Welcome Back
                </h1>

                <p className="mb-6 text-center text-gray-500">
                    Login to continue using CoinTrail
                </p>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();

                        console.log({
                            email,
                            password,
                        });
                    }}
                    className="space-y-5"
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
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
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
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700"
                    >
                        Login
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

        </div>
    );
}

export default LoginPage;