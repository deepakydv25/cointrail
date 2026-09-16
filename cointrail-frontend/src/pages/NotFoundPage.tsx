import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NotFoundPage() {
    const { isAuthenticated } = useAuth();

    return (
        <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
                <p className="text-sm font-semibold text-blue-600">
                    404
                </p>

                <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
                    Page not found
                </h1>

                <p className="mt-4 text-gray-500">
                    The page you're looking for doesn't exist.
                </p>

                <Link
                    to={isAuthenticated ? "/dashboard" : "/"}
                    className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
                >
                    {isAuthenticated ? "Go to Dashboard" : "Go Home"}
                </Link>
            </div>
        </main>
    )
}

export default NotFoundPage;