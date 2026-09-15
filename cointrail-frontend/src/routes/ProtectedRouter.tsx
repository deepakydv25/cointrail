import { Navigate, Outlet } from "react-router-dom";

function ProctectedRoute() {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        return <Navigate to="/login" replace />
    }

    return <Outlet />
}

export default ProctectedRoute;