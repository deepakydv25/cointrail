import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ButtonLink } from '../ui/Button';
import Brand from '../Brand';
import PublicHeader from '../PublicHeader';

export default function PublicLandingNavigation() {
    const { isAuthenticated } = useAuth();
    return <PublicHeader className="ct-landing-header">
            <Link to="/" className="ct-landing-brand" aria-label="CoinTrail home"><Brand /></Link>
            <div className="ct-landing-nav-actions">
                {isAuthenticated ? <ButtonLink variant="primary" to="/dashboard" aria-label="Go to Dashboard">
                    <span className="ct-landing-dashboard-full">Go to Dashboard</span><span className="ct-landing-dashboard-compact" aria-hidden="true">Dashboard</span>
                </ButtonLink> : <><ButtonLink variant="ghost" to="/login">Sign In</ButtonLink><ButtonLink variant="primary" to="/register">Get Started</ButtonLink></>}
            </div>
    </PublicHeader>;
}
