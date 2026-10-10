import { Outlet, useLocation } from 'react-router-dom';

export default function AppLayout() {
    const { pathname } = useLocation();
    const legacy = pathname === '/dashboard' || pathname.startsWith('/expenses');
    return <div className={legacy ? 'legacy-content' : 'clarity-content'}>
        {(pathname === '/dashboard' || pathname.startsWith('/expenses')) &&
            <p className="mx-auto max-w-7xl px-4 pt-4 text-sm text-gray-600 sm:px-6 lg:px-8">
                Legacy expense records remain available and are excluded from Dashboard and Analytics transaction reports.
            </p>}
        <Outlet />
    </div>;
}
