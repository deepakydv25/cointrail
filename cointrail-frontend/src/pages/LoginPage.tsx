import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../servcies/authService";
import { useAuth } from "../context/AuthContext";

function LoginPage() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    
    const navigate = useNavigate();

    return (
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-gray-50 px-4 py-8">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md sm:p-8">
                <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
                    Welcome Back
                </h1>

                <p className="mb-6 text-center text-gray-500">
                    Login to continue using CoinTrail
                </p>

                <form
                    onSubmit={async (e) => {
                        e.preventDefault();

                        setError('');
                        setIsLoading(true);

                        try {
                            const response = await loginUser({
                                email,
                                password,
                            });

                            login(response.accessToken);
                            navigate('/dashboard')
                        } catch(err) {
                            console.error(err);
                            setError('Invalid email or password');
                        } finally {
                            setIsLoading(false);
                        }
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

                    {error && (
                        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </p>
                    )}
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

        </div>
    );
}

export default LoginPage;