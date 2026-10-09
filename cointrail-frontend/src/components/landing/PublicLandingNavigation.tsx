import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { Button, ButtonLink } from '../ui/Button';
import { Icon } from '../ui/Icon';

export default function PublicLandingNavigation() {
    const { isAuthenticated } = useAuth();
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const brand = useRef<HTMLAnchorElement>(null);
    const location = useLocation();
    useEffect(() => {
        const frame = requestAnimationFrame(() => setOpen(false));
        return () => cancelAnimationFrame(frame);
    }, [location.key]);
    useEffect(() => {
        if (!window.matchMedia) return;
        const media = window.matchMedia('(min-width: 1024px)');
        const reset = () => {
            const focused = document.activeElement;
            if (!media.matches && focused && panel.current?.contains(focused)) trigger.current?.focus();
            else if (media.matches && focused === trigger.current) brand.current?.focus();
            setOpen(false);
        };
        media.addEventListener('change', reset);
        return () => media.removeEventListener('change', reset);
    }, []);
    return <header className="ct-landing-header"><nav className="ct-landing-nav" aria-label="Primary navigation" onKeyDown={event => {
        if (event.key === 'Escape' && open) { setOpen(false); trigger.current?.focus(); }
    }}>
        <Link ref={brand} to="/" className="ct-landing-brand" aria-label="CoinTrail home"><img src="/cointrail-mark.svg" alt="" width="32" height="32" />CoinTrail</Link>
        <Button ref={trigger} variant="ghost" size="icon" className="ct-landing-toggle" aria-label="Toggle navigation menu" aria-expanded={open} aria-controls="landing-navigation" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></Button>
        <div ref={panel} id="landing-navigation" className={`ct-landing-nav-panel ${open ? 'ct-landing-nav-panel--open' : ''}`} onClick={event => { if ((event.target as HTMLElement).closest('a')) setOpen(false); }}>
            <a href="#features">Features</a><a href="#how-it-works">How it works</a>
            {isAuthenticated ? <ButtonLink variant="primary" to="/dashboard">Go to Dashboard</ButtonLink> : <><ButtonLink variant="ghost" to="/login">Sign In</ButtonLink><ButtonLink variant="primary" to="/register">Get Started</ButtonLink></>}
        </div>
    </nav></header>;
}
