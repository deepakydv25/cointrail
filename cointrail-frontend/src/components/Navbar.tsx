import { Link } from "react-router-dom";

function Navbar() {
    return(
        <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <Link 
                to="/"
                className="text-2xl font-bold text-blue-600"
            >CoinTrail</Link>

            <div className="flex items-center gap-6">
                <Link 
                    to="/dashboard"
                    className="text-gray-700 hover:text-blue-600"
                >Dashboard</Link>
                <Link 
                    to="/expenses"
                    className="text-gray-700 hover:text-blue-600"
                >Expenses</Link>
                <Link 
                    to="/login"
                    className="text-gray-700 hover:text-blue-600"
                >Login</Link>
                <Link 
                    to="/register"
                    className="text-gray-700 hover:text-blue-600"
                >Register</Link>
            </div>
        </nav>
    )
}

export default Navbar;