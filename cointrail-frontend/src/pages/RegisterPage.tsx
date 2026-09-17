import { useState } from "react";
import { Link } from "react-router-dom";
import { registerUser } from "../servcies/authService";

function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
                <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
                    Create Account
                </h1>

                <p className="mb-6 text-center text-gray-600">
                    Start tracking your expenses with CoinTrail
                </p>

                <form
                    onSubmit={async (e) => {
                        e.preventDefault();

                        setMessage('');
                        setError('');
                        setIsLoading(true);

                        try {
                            await registerUser({
                                name,
                                email,
                                password,
                            });

                            setMessage('Registration successful.');

                            setName('');
                            setEmail('');
                            setPassword('');
                        } catch(err) {
                            console.error(err);
                            setError('Registration failed.');
                        } finally {
                            setIsLoading(false);
                        }
                    }}
                    className="space-y-5" 
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
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
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

                    {message && (
                        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                            {message}
                        </p>
                    )}

                    {error && (
                        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </p>
                    )}
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

        </div>
    );
}

export default RegisterPage;