import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { LoadingState } from '../components/ui/States';

function ProtectedRoute() {
    const { isAuthenticated, isInitialized, sessionVersion } = useAuth();
    const location = useLocation();
    if (!isInitialized) return <LoadingState message="Checking session…" />;
    if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
    // Never reuse mounted user-owned page state across sessions.
    return <Outlet key={sessionVersion} />;
}
export default ProtectedRoute;
