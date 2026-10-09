import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Button } from './ui/Button';
import { Icon, type IconName } from './ui/Icon';

export default function Navbar({ appearance = 'classic' }: { appearance?: 'classic' | 'clarity' }) {
    return appearance === 'clarity' ? <ApplicationNavigation /> : <ClassicNavbar />;
}

function ApplicationNavigation() {
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const navigation = useRef<HTMLElement>(null);
    const location = useLocation();
    const previousLocation = useRef(location.key);
    const navigate = useNavigate();
    const { logout } = useAuth();
    useEffect(() => {
        // Browser history navigation must close the disclosure too.
        if (previousLocation.current === location.key) return;
        previousLocation.current = location.key;
        const frame = requestAnimationFrame(() => setOpen(false));
        return () => cancelAnimationFrame(frame);
    }, [location.key]);
    useEffect(() => {
        if (!window.matchMedia) return;
        const media = window.matchMedia('(min-width: 768px)');
        const reset = () => {
            setOpen(false);
            const focused = document.activeElement;
            if (!media.matches && focused && navigation.current?.contains(focused) && focused !== trigger.current) trigger.current?.focus();
            else if (media.matches && focused === trigger.current) navigation.current?.querySelector<HTMLAnchorElement>('.ct-brand')?.focus();
        };
        media.addEventListener('change', reset);
        return () => media.removeEventListener('change', reset);
    }, []);
    const destination = (to: string, label: string, icon: IconName) => <NavLink to={to} className="ct-nav-link" onClick={() => setOpen(false)}><Icon name={icon} />{label}</NavLink>;
    return <nav ref={navigation} aria-label="Primary navigation" className="ct-navigation" onKeyDown={event => {
        if (event.key === 'Escape' && open) { setOpen(false); trigger.current?.focus(); }
    }}>
        <div className="ct-nav-top"><Link to="/" className="ct-brand" aria-label="CoinTrail home" onClick={() => setOpen(false)}>
            <img src="/cointrail-mark.svg" alt="" /><span>CoinTrail</span></Link>
            <Button ref={trigger} variant="ghost" size="icon" className="ct-nav-toggle" aria-label="Toggle navigation menu"
                aria-expanded={open} aria-controls="application-navigation" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></Button>
        </div>
        <div id="application-navigation" className={`ct-nav-panel ${open ? 'ct-nav-panel--open' : ''}`}>
            <p className="ct-nav-label">V2</p>
            <div className="ct-nav-group">{destination('/app/dashboard', 'Dashboard V2', 'overview')}{destination('/app/transactions', 'Transactions', 'transactions')}{destination('/app/budgets', 'Budgets', 'overview')}{destination('/app/analytics', 'Analytics', 'overview')}{destination('/app/recurring', 'Recurring Transactions', 'transactions')}{destination('/app/accounts', 'Accounts', 'account')}{destination('/app/categories', 'Categories', 'tag')}</div>
            <p className="ct-nav-label">Legacy</p><div className="ct-nav-group">{destination('/dashboard', 'Legacy Overview', 'overview')}{destination('/expenses', 'Legacy Expenses', 'receipt')}</div>
            <Button variant="ghost" className="ct-nav-logout" onClick={() => {
                // Resolve the guard's session-change update before issuing the
                // explicit public destination, so it cannot overwrite that route.
                flushSync(logout);
                navigate('/');
            }}><Icon name="logout" />Logout</Button>
        </div>
    </nav>;
}

function ClassicNavbar() {
    const [isOpen, setIsOpen] = useState(false);
    const button = useRef<HTMLButtonElement>(null);
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const close = () => setIsOpen(false);
    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `rounded px-2 py-2 font-medium transition hover:text-blue-600 ${isActive ? 'text-blue-700 underline underline-offset-4' : 'text-gray-700'}`;
    return (
        <nav aria-label="Primary navigation" className="border-b border-gray-200 bg-white"
            onKeyDown={event => {
                if (event.key === 'Escape' && isOpen) { close(); button.current?.focus(); }
            }}>
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <Link to="/" aria-label="CoinTrail home" onClick={close} className="group flex items-center gap-3 rounded">
                    <img src="/cointrail-mark.svg" alt="" className="h-10 w-10 transition-transform duration-200 motion-safe:group-hover:scale-105" />
                    <span className="flex flex-col leading-none">
                        <span className="text-xl font-bold tracking-tight"><span className="text-blue-600">Coin</span><span className="text-slate-900">Trail</span></span>
                        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Spend with intention</span>
                    </span>
                </Link>
                <button ref={button} type="button" onClick={() => setIsOpen(!isOpen)}
                    className="rounded p-3 text-gray-700 hover:bg-gray-100 lg:hidden"
                    aria-label="Toggle navigation menu" aria-expanded={isOpen} aria-controls="primary-navigation">
                    <span aria-hidden="true">{isOpen ? '✕' : '☰'}</span>
                </button>
                <div id="primary-navigation" className={`${isOpen ? 'flex' : 'hidden'} w-full flex-col gap-3 border-t border-gray-200 pt-4 lg:flex lg:w-auto lg:flex-row lg:items-center lg:border-0 lg:pt-0`}>
                    {isAuthenticated ? <>
                        <NavLink to="/app/accounts" className={linkClass} onClick={close}>Accounts</NavLink>
                        <NavLink to="/app/categories" className={linkClass} onClick={close}>Categories</NavLink>
                        <NavLink to="/app/transactions" className={linkClass} onClick={close}>Transactions</NavLink>
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Legacy</span>
                        <NavLink to="/dashboard" className={linkClass} onClick={close}>Legacy Overview</NavLink>
                        <NavLink to="/expenses" className={linkClass} onClick={close}>Legacy Expenses</NavLink>
                        <button type="button" onClick={() => { logout(); close(); navigate('/'); }}
                            className="rounded-lg bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700">Logout</button>
                    </> : <>
                        <NavLink to="/login" className={linkClass} onClick={close}>Login</NavLink>
                        <NavLink to="/register" className={linkClass} onClick={close}>Register</NavLink>
                    </>}
                </div>
            </div>
        </nav>
    );
}
