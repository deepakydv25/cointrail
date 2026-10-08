import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { LoadingState } from '../components/ui/States';
import { safeReturnPath } from './returnPath';

function PublicRoute() {
    const { isAuthenticated, isInitialized } = useAuth();
    const location = useLocation();
    if (!isInitialized) return <LoadingState message="Checking session…" />;
    if (isAuthenticated) return <Navigate to={safeReturnPath(location.state?.from)} replace />;
    return <Outlet />;
}
export default PublicRoute;
