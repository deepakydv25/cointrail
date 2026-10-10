import { AUTHENTICATED_HOME } from '../routes/destinations';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Button } from './ui/Button';
import { Icon, type IconName } from './ui/Icon';
import Brand from './Brand';
import PublicHeader from './PublicHeader';
import MobileNavigationDrawer from './MobileNavigationDrawer';

export default function Navbar({ appearance = 'classic', expanded = false, onToggle }: {
    appearance?: 'classic' | 'clarity'; expanded?: boolean; onToggle?: () => void;
}) {
    return appearance === 'clarity' ? <ApplicationNavigation expanded={expanded} onToggle={onToggle} /> : <ClassicNavbar />;
}

function ApplicationNavigation({ expanded, onToggle }: { expanded: boolean; onToggle?: () => void }) {
    const location = useLocation();
    const [menu, setMenu] = useState({ key: location.key, open: false });
    // Reset during rendering so route commits unmount the modal and release its
    // scroll lock together, even when animation frames are delayed or suspended.
    if (menu.key !== location.key) setMenu({ key: location.key, open: false });
    const open = menu.key === location.key && menu.open;
    const setOpen = (value: boolean) => setMenu(previous => ({ ...previous, open: value }));
    const trigger = useRef<HTMLButtonElement>(null);
    const navigation = useRef<HTMLElement>(null);
    const drawer = useRef<HTMLDialogElement>(null);
    const navigate = useNavigate();
    const { logout } = useAuth();
    useEffect(() => {
        if (!window.matchMedia) return;
        const media = window.matchMedia('(min-width: 768px)');
        const reset = () => {
            const focused = document.activeElement;
            const fromDrawer = !!focused && !!drawer.current?.contains(focused);
            flushSync(() => setOpen(false));
            if (!media.matches && focused && navigation.current?.contains(focused) && focused !== trigger.current) trigger.current?.focus();
            else if (media.matches && (focused === trigger.current || fromDrawer)) navigation.current?.querySelector<HTMLButtonElement>('.ct-nav-expand')?.focus();
        };
        media.addEventListener('change', reset);
        return () => media.removeEventListener('change', reset);
    }, []);
    const [hint, setHint] = useState<{ label: string; top: number } | null>(null);
    const closeMobileNavigation = () => {
        flushSync(() => setOpen(false));
    };
    const destination = (to: string, label: string, icon: IconName) => <NavLink to={to} aria-label={label} title={label} className="ct-nav-link"
        onFocus={event => setHint({ label, top: Math.max(8, Math.min(window.innerHeight - 48, event.currentTarget.getBoundingClientRect().top)) })} onBlur={() => setHint(null)}
        onClick={() => { closeMobileNavigation(); setHint(null); }}><Icon name={icon} /><span className="ct-nav-text">{label}</span></NavLink>;
    const dismiss = () => { flushSync(() => setOpen(false)); trigger.current?.focus(); };
    const navigationContent = <>
        <div id="application-navigation" className="ct-nav-panel">
            <p className="ct-nav-label">Workspace</p>
            <div className="ct-nav-group">{destination(AUTHENTICATED_HOME, 'Dashboard', 'overview')}{destination('/app/transactions', 'Transactions', 'transactions')}{destination('/app/budgets', 'Budgets', 'overview')}{destination('/app/analytics', 'Analytics', 'overview')}{destination('/app/recurring', 'Recurring transactions', 'transactions')}{destination('/app/accounts', 'Accounts', 'account')}{destination('/app/categories', 'Categories', 'tag')}</div>
            <p className="ct-nav-label">Legacy expenses</p><div className="ct-nav-group">{destination('/dashboard', 'Expense overview', 'overview')}{destination('/expenses', 'Expense records', 'receipt')}</div>
        </div>
        <div id="application-navigation-logout" className="ct-nav-bottom">
            <Button variant="ghost" className="ct-nav-logout" aria-label="Logout" title="Logout"
                onFocus={event => setHint({ label: 'Logout', top: Math.max(8, Math.min(window.innerHeight - 48, event.currentTarget.getBoundingClientRect().top)) })} onBlur={() => setHint(null)} onClick={() => {
                // Resolve the guard's session-change update before issuing the
                // explicit public destination, so it cannot overwrite that route.
                flushSync(logout);
                navigate('/');
            }}><Icon name="logout" /><span className="ct-nav-text">Logout</span></Button>
        </div>
    </>;
    return <nav ref={navigation} aria-label="Primary navigation" className="ct-navigation" onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); dismiss(); }
    }}>
        <div className="ct-nav-top ct-glass-header"><Link to={AUTHENTICATED_HOME} className="ct-brand" aria-label="CoinTrail dashboard" onClick={closeMobileNavigation}>
            <Brand /></Link>
            <Button ref={trigger} variant="ghost" size="icon" className="ct-nav-toggle" aria-label="Toggle navigation menu"
                aria-expanded={open} aria-controls="application-navigation application-navigation-logout" aria-haspopup="dialog" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></Button>
            <Button variant="ghost" size="icon" className="ct-nav-expand" aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
                title={expanded ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={expanded} aria-controls="application-navigation" onClick={() => { setHint(null); onToggle?.(); }}>
                <span className="ct-nav-expand-logo"><Brand /><Icon name="chevron-right" /></span><span className="ct-nav-expand-icon"><Icon name="chevron-left" /></span>
            </Button>
        </div>
        {!open && navigationContent}
        {open && <MobileNavigationDrawer dialog={drawer} onDismiss={dismiss}>{navigationContent}</MobileNavigationDrawer>}
        {hint && <span aria-hidden="true" className="ct-nav-hint" style={{ top: hint.top }}>{hint.label}</span>}
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
