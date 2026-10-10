import { AUTHENTICATED_HOME } from '../../routes/destinations';
import { useRef } from 'react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ButtonLink } from '../ui/Button';
import Brand from '../Brand';
import PublicHeader from '../PublicHeader';

export default function PublicLandingNavigation() {
    const { isAuthenticated, logout } = useAuth();
    const profile = useRef<HTMLDetailsElement>(null);
    return <PublicHeader className="ct-landing-header">
            <Link to="/" className="ct-landing-brand" aria-label="CoinTrail home"><Brand /></Link>
            <div className="ct-landing-nav-actions">
                {isAuthenticated ? <details ref={profile} className="ct-profile-menu" onKeyDown={event => {
                    if (event.key === 'Escape' && profile.current) { profile.current.open = false; profile.current.querySelector('summary')?.focus(); }
                }}><summary aria-label="User profile" title="User profile"><Icon name="profile" /><span>Profile</span></summary>
                    <div className="ct-profile-options"><ButtonLink variant="ghost" to={AUTHENTICATED_HOME} aria-label="Go to Dashboard">Dashboard</ButtonLink><Button variant="ghost" onClick={logout}><Icon name="logout" />Logout</Button></div>
                </details> : <><ButtonLink variant="ghost" to="/login">Sign In</ButtonLink><ButtonLink variant="primary" to="/register">Get Started</ButtonLink></>}
            </div>
    </PublicHeader>;
}
