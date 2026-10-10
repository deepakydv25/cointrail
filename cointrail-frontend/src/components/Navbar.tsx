import { AUTHENTICATED_HOME } from '../routes/destinations';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Button } from './ui/Button';
import { Icon, type IconName } from './ui/Icon';
import Brand from './Brand';
import PublicHeader from './PublicHeader';

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
        <div className="ct-nav-top ct-glass-header"><Link to={AUTHENTICATED_HOME} className="ct-brand" aria-label="CoinTrail dashboard" onClick={() => setOpen(false)}>
            <Brand /></Link>
            <Button ref={trigger} variant="ghost" size="icon" className="ct-nav-toggle" aria-label="Toggle navigation menu"
                aria-expanded={open} aria-controls="application-navigation" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></Button>
        </div>
        <div id="application-navigation" className={`ct-nav-panel ${open ? 'ct-nav-panel--open' : ''}`}>
            <p className="ct-nav-label">Workspace</p>
            <div className="ct-nav-group">{destination(AUTHENTICATED_HOME, 'Dashboard', 'overview')}{destination('/app/transactions', 'Transactions', 'transactions')}{destination('/app/budgets', 'Budgets', 'overview')}{destination('/app/analytics', 'Analytics', 'overview')}{destination('/app/recurring', 'Recurring transactions', 'transactions')}{destination('/app/accounts', 'Accounts', 'account')}{destination('/app/categories', 'Categories', 'tag')}</div>
            <p className="ct-nav-label">Legacy expenses</p><div className="ct-nav-group">{destination('/dashboard', 'Expense overview', 'overview')}{destination('/expenses', 'Expense records', 'receipt')}</div>
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
        `ct-button ct-button--ghost${isActive ? ' ct-public-link--active' : ''}`;
    return (
        <PublicHeader
            onKeyDown={event => {
                if (event.key === 'Escape' && isOpen) { close(); button.current?.focus(); }
            }}>
                <Link to="/" aria-label="CoinTrail home" onClick={close} className="ct-brand rounded">
                    <Brand />
                </Link>
                {isAuthenticated && <Button ref={button} variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}
                    className="ct-public-menu-toggle"
                    aria-label="Toggle navigation menu" aria-expanded={isOpen} aria-controls="primary-navigation">
                    <span aria-hidden="true">{isOpen ? '✕' : '☰'}</span>
                </Button>}
                {isAuthenticated ? <div id="primary-navigation" className={`ct-public-menu${isOpen ? ' ct-public-menu--open' : ''}`}>
                        <NavLink to="/app/accounts" className={linkClass} onClick={close}>Accounts</NavLink>
                        <NavLink to="/app/categories" className={linkClass} onClick={close}>Categories</NavLink>
                        <NavLink to="/app/transactions" className={linkClass} onClick={close}>Transactions</NavLink>
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Legacy expenses</span>
                        <NavLink to="/dashboard" className={linkClass} onClick={close}>Expense overview</NavLink>
                        <NavLink to="/expenses" className={linkClass} onClick={close}>Expense records</NavLink>
                        <Button variant="danger" onClick={() => { logout(); close(); navigate('/'); }}>Logout</Button>
                </div> : <div className="ct-landing-nav-actions">
                    <NavLink className={linkClass} to="/login">Login</NavLink>
                    <NavLink className={({ isActive }) => `ct-button ct-button--primary${isActive ? ' ct-public-link--active' : ''}`} to="/register">Register</NavLink>
                </div>}
        </PublicHeader>
    );
}
