import { useEffect, useRef } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import DashboardV2Page from './pages/dashboard/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ExpensesPage from './pages/ExpensesPage';
import Navbar from './components/Navbar';
import AppShell from './components/AppShell';
import ProtectedRoute from './routes/ProtectedRoute';
import CreateExpensePage from './pages/CreateExpensePage';
import ExpenseDetailsPage from './pages/ExpenseDetailsPage';
import EditExpensePage from './pages/EditExpensePage';
import LandingPage from './pages/LandingPage';
import PublicRoute from './routes/PublicRoute';
import AppLayout from './routes/AppLayout';
import NotFoundPage from './pages/NotFoundPage';
import AccountsPage from './pages/accounts/AccountsPage';
import AccountFormPage from './pages/accounts/AccountFormPage';
import AccountDetailsPage from './pages/accounts/AccountDetailsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import CategoryFormPage from './pages/categories/CategoryFormPage';
import CategoryDetailsPage from './pages/categories/CategoryDetailsPage';
import TransactionsPage from './pages/transactions/TransactionsPage';
import TransactionFormPage from './pages/transactions/TransactionFormPage';
import TransactionDetailsPage from './pages/transactions/TransactionDetailsPage';
import BudgetsPage from './pages/budgets/BudgetsPage';
import BudgetFormPage from './pages/budgets/BudgetFormPage';
import BudgetDetailsPage from './pages/budgets/BudgetDetailsPage';

function SiteLayout({ application = false }: { application?: boolean }) {
    const location = useLocation();
    const content = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            // Do not steal focus if the user (or a confirmation panel) has
            // already focused a control in the newly mounted page.
            const focused = document.activeElement;
            if (focused && focused !== content.current && content.current?.contains(focused) &&
                focused.matches('a, button, input, select, textarea')) return;
            const heading = content.current?.querySelector('h1');
            if (heading) { heading.tabIndex = -1; heading.focus(); }
            else content.current?.focus();
        });
        return () => cancelAnimationFrame(frame);
    }, [location.pathname]);
    const body = <div id="main-content" tabIndex={-1} ref={content}><Outlet /></div>;
    return <>
        <a href="#main-content" className={`sr-only focus:not-sr-only focus:block focus:p-3 ${application ? 'ct-skip' : ''}`}>Skip to content</a>
        {application ? <AppShell>{body}</AppShell> : <><Navbar key={location.pathname} />{body}</>}
    </>;
}

export default function App() {
    const { pathname } = useLocation();
    return <Routes>
        <Route element={<SiteLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
            <Route element={<SiteLayout application />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/expenses" element={<ExpensesPage />} />
                    <Route path="/expenses/create" element={<CreateExpensePage />} />
                    <Route path="/expenses/:id" element={<ExpenseDetailsPage />} />
                    <Route path="/expenses/:id/edit" element={<EditExpensePage />} />
                    <Route path="/app" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/app/dashboard" element={<DashboardV2Page />} />
                    <Route path="/app/budgets" element={<BudgetsPage />} />
                    <Route path="/app/budgets/create" element={<BudgetFormPage key={pathname} />} />
                    <Route path="/app/budgets/:id" element={<BudgetDetailsPage key={pathname} />} />
                    <Route path="/app/budgets/:id/edit" element={<BudgetFormPage key={pathname} />} />
                    <Route path="/app/accounts" element={<AccountsPage />} />
                    <Route path="/app/accounts/create" element={<AccountFormPage key={pathname} />} />
                    <Route path="/app/accounts/:id" element={<AccountDetailsPage key={pathname} />} />
                    <Route path="/app/accounts/:id/edit" element={<AccountFormPage key={pathname} />} />
                    <Route path="/app/categories" element={<CategoriesPage />} />
                    <Route path="/app/categories/create" element={<CategoryFormPage key={pathname} />} />
                    <Route path="/app/categories/:id" element={<CategoryDetailsPage key={pathname} />} />
                    <Route path="/app/categories/:id/edit" element={<CategoryFormPage key={pathname} />} />
                    <Route path="/app/transactions" element={<TransactionsPage />} />
                    <Route path="/app/transactions/create" element={<TransactionFormPage key={pathname} />} />
                    <Route path="/app/transactions/:id" element={<TransactionDetailsPage key={pathname} />} />
                    <Route path="/app/transactions/:id/edit" element={<TransactionFormPage key={pathname} />} />
                    <Route path="/app/*" element={<NotFoundPage />} />
                </Route>
            </Route>
        </Route>
    </Routes>;
}
