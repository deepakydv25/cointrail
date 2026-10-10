import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Brand from '../components/Brand';
import { useAuth } from '../context/useAuth';
import { ButtonLink } from '../components/ui/Button';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { Icon, type IconName } from '../components/ui/Icon';
import DashboardPreview from '../components/landing/DashboardPreview';

const features: { title: string; description: string; icon: IconName }[] = [
    { title: 'Accounts', description: 'Organize your accounts and review balances based on the opening balances and transactions you record.', icon: 'account' },
    { title: 'Transactions', description: 'Record income and expenses with accounts, categories, dates, and optional descriptions.', icon: 'transactions' },
    { title: 'Budgets', description: 'Set monthly limits for expense categories and review spending, remaining amounts, and over-budget indicators.', icon: 'overview' },
    { title: 'Recurring Transactions', description: 'Create recurring income and expense rules, and pause or cancel them when plans change.', icon: 'transactions' },
    { title: 'Analytics', description: 'Explore income and expense trends, category spending, account activity, and comparisons between periods.', icon: 'overview' },
];

export default function LandingPage() {
    const { isAuthenticated } = useAuth();
    useEffect(() => {
        const previous = document.title;
        document.title = 'CoinTrail — Understand where your money goes.';
        return () => { document.title = previous; };
    }, []);
    return <div className="ct-landing">
        <main>
            <section className="ct-landing-section ct-landing-hero" aria-labelledby="landing-title">
                <p className="ct-landing-eyebrow">Personal finance, clearly organized</p>
                <h1 id="landing-title">Understand where your money goes.</h1>
                <p className="ct-landing-lead">Record income and expenses, organize your accounts, and manage monthly budgets in one clear workspace.</p>
                <div className="ct-landing-actions">{isAuthenticated ? <ButtonLink variant="primary" to="/dashboard">Go to Dashboard</ButtonLink> : <><ButtonLink variant="primary" to="/register">Get Started</ButtonLink><ButtonLink to="/login">Sign In</ButtonLink></>}</div>
                <p className="ct-description">A clearer view starts with the transactions you record.</p>
            </section>
            <section className="ct-landing-section ct-landing-product" aria-labelledby="preview-title">
                <div className="ct-landing-section-heading"><h2 id="preview-title">Your financial activity, in focus.</h2><p>Review account balances, monthly income and expenses, category spending, and recent transactions in your dashboard.</p></div>
                <DashboardPreview />
            </section>
            <section id="features" tabIndex={-1} className="ct-landing-section" aria-labelledby="features-title">
                <div className="ct-landing-section-heading"><h2 id="features-title">The tools to understand your everyday money.</h2><p>Keep your financial activity organized, from your first transaction to your monthly review.</p></div>
                <div className="ct-landing-features">{features.map(feature => <SurfaceCard key={feature.title}><span className="ct-category-icon" aria-hidden="true"><Icon name={feature.icon} /></span><h3>{feature.title}</h3><p>{feature.description}</p></SurfaceCard>)}</div>
            </section>
            <section id="how-it-works" tabIndex={-1} className="ct-landing-section" aria-labelledby="steps-title">
                <div className="ct-landing-section-heading"><h2 id="steps-title">A simple way to build a clearer picture.</h2></div>
                <ol className="ct-landing-steps" role="list">{[
                    ['Organize your accounts', 'Add your accounts and opening balances.'],
                    ['Record your activity', 'Add income and expenses with the right accounts and categories.'],
                    ['Review and plan', 'Review your dashboard and analytics, and set monthly category budgets.'],
                ].map(([title, description], index) => <li key={title}><span className="ct-landing-step-number" aria-hidden="true">{index + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
            </section>
            <section className="ct-landing-section ct-landing-final" aria-labelledby="final-title">
                <SurfaceCard><h2 id="final-title">Make your next money decision with a clearer view.</h2><p>{isAuthenticated ? 'Continue reviewing the financial activity you record.' : 'Start recording your financial activity with CoinTrail.'}</p><div className="ct-landing-actions">{isAuthenticated ? <ButtonLink variant="primary" to="/dashboard">Go to Dashboard</ButtonLink> : <><ButtonLink variant="primary" to="/register">Create your account</ButtonLink><ButtonLink to="/login">Sign In</ButtonLink></>}</div></SurfaceCard>
            </section>
        </main>
        <footer className="ct-landing-footer">
            <div className="ct-landing-footer-inner">
                <div><Link to="/" className="ct-landing-brand" aria-label="CoinTrail home"><Brand /></Link><p>Understand where your money goes.</p></div>
                <nav aria-label="Footer navigation" className="ct-landing-footer-groups">
                    <div><h2>Explore</h2><a href="#features">Features</a><a href="#how-it-works">How It Works</a></div>
                    <div><h2>Your account</h2>{isAuthenticated ? <ButtonLink variant="ghost" to="/dashboard">Go to Dashboard</ButtonLink> : <><ButtonLink variant="ghost" to="/login">Sign In</ButtonLink><ButtonLink variant="ghost" to="/register">Get Started</ButtonLink></>}</div>
                </nav>
                <p className="ct-landing-copyright">© {new Date().getFullYear()} CoinTrail.</p>
            </div>
        </footer>
    </div>;
}
