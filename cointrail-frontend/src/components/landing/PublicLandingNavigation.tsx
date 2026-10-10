import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ButtonLink } from '../ui/Button';
import Brand from '../Brand';

export default function PublicLandingNavigation() {
    const { isAuthenticated } = useAuth();
    const [scrolled, setScrolled] = useState(() => window.scrollY > 8);
    useEffect(() => {
        const update = () => setScrolled(previous => {
            const next = window.scrollY > 8;
            return previous === next ? previous : next;
        });
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);
    return <header className={`ct-landing-header${scrolled ? ' ct-landing-header--scrolled' : ''}`}>
        <nav className="ct-landing-nav" aria-label="Primary navigation">
            <Link to="/" className="ct-landing-brand" aria-label="CoinTrail home"><Brand /></Link>
            <div className="ct-landing-nav-actions">
                {isAuthenticated ? <ButtonLink variant="primary" to="/dashboard" aria-label="Go to Dashboard">
                    <span className="ct-landing-dashboard-full">Go to Dashboard</span><span className="ct-landing-dashboard-compact" aria-hidden="true">Dashboard</span>
                </ButtonLink> : <><ButtonLink variant="ghost" to="/login">Sign In</ButtonLink><ButtonLink variant="primary" to="/register">Get Started</ButtonLink></>}
            </div>
        </nav>
    </header>;
}
