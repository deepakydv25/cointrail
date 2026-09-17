import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {

    const [isOpen, setIsOpen] = useState(false);
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        setIsOpen(false);
        navigate('/');
    };

    return (
        <nav className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <Link
                    to="/"
                    className="group flex items-center gap-3"
                    aria-label="CoinTrail home"
                >
                    <img
                        src="/cointrail-mark.svg"
                        alt=""
                        className="h-10 w-10 transition-transform duration-200 group-hover:scale-105"
                    />
                    <span className="flex flex-col leading-none">
                        <span className="text-xl font-bold tracking-tight">
                            <span className="text-blue-600">Coin</span><span className="text-slate-900">Trail</span>
                        </span>
                        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Spend with intention
                        </span>
                    </span>
                </Link>

                <div className="hidden items-center gap-6 md:flex">
                    {isAuthenticated ? (
                        <>
                            <Link
                                to="/dashboard"
                                className="text-gray-700 transition hover:text-blue-600"
                            >
                                Dashboard
                            </Link>

                            <Link
                                to="/expenses"
                                className="text-gray-700 transition hover:text-blue-600"
                            >
                                Expenses
                            </Link>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition hover:bg-red-600 cursor-pointer"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="text-gray-700 transition hover:text-blue-600"
                            >
                                Login
                            </Link>

                            <Link
                                to="/register"
                                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                            >
                                Register
                            </Link>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="cursor-pointer rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
                    aria-label="Toggle navigation menu"
                >
                    {isOpen ? '✕' : '☰'}
                </button>
            </div>

            {isOpen && (
                <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
                    <div className="flex flex-col gap-4">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/dashboard"
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-700 hover:text-blue-600"
                                >
                                    Dashboard
                                </Link>

                                <Link
                                    to="/expenses"
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-700 hover:text-blue-600"
                                >
                                    Expenses
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-center font-medium text-white"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-700 hover:text-blue-600"
                                >
                                    Login
                                </Link>

                                <Link
                                    to="/register"
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
                                >
                                    Register
                                </Link>
                            </>
                        )}

                    </div>
                </div>
            )}
        </nav>
    )
}

export default Navbar;