import { useState } from "react";
import { Link } from "react-router-dom";

function Navbar() {

    const [isOpen, setIsOpen] = useState(false);

    return(
        <nav className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <Link 
                    to="/"
                    className="text-2xl font-bold text-blue-600"
                >CoinTrail</Link>

                <div className="hidden items-center gap-6 md:flex">
                    <Link 
                        to="/dashboard"
                        className="text-gray-700 transition hover:text-blue-600"
                    >Dashboard</Link>
                    <Link 
                        to="/expenses"
                        className="text-gray-700 transition hover:text-blue-600"
                    >Expenses</Link>
                    <Link 
                        to="/login"
                        className="text-gray-700 transition hover:text-blue-600"
                    >Login</Link>
                    <Link 
                        to="/register"
                        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                    >Register</Link>
                </div>

                <button 
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
                    aria-label="Toggle navigation menu"   
                >
                    {isOpen ? '✕' : '☰'}
                </button>
            </div>

            {isOpen && (
                <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
                    <div className="flex flex-col gap-4">
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
                    </div>
                </div>
            )}
        </nav>
    )
}

export default Navbar;