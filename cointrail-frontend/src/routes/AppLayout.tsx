import { Outlet, useLocation } from 'react-router-dom';

export default function AppLayout() {
    const { pathname } = useLocation();
    return <>
        {(pathname === '/dashboard' || pathname.startsWith('/expenses')) &&
            <p className="mx-auto max-w-7xl px-4 pt-4 text-sm text-gray-600 sm:px-6 lg:px-8">
                Legacy Expenses · These records remain available and do not contribute to V2 reports.
            </p>}
        <Outlet />
    </>;
}
