import { Link } from "react-router-dom";

function LandingPage() {
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;
    
    return (
        <main>
            {/* Hero */}
            <section className="mx-auto max-w-7xl px-4 py-16 sm:px6 sm:py-24 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-600">
                        Simple expense tracking
                    </p>

                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                        Take control of your spending.
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
                        Track your expenses. understand where your money goes,
                        and manage your spending with CoinTrail.
                    </p>

                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        {isLoggedIn ? (
                            <Link
                                to="/dashboard"
                                className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/register"
                                    className="rounded-lg bg-blue-600 px-7 py-3 font-medium text-white transition hover:bg-blue-700"
                                >   
                                    Get Started
                                </Link>

                                <Link
                                    to="/login"
                                    className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
                                >
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="border-y border-gray-200 bg-gray-50">
                <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                            Everything you need to track your spending
                        </h2>

                        <p className="mt-3 text-gray-300">
                            A simple way to record, organize, and understand
                            your everyday expenses.
                        </p>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">

                        <FeatureCard 
                            title="Track Expenses"
                            description="Quickly record your everyday expenses and keep your spending history organized."
                        />

                        <FeatureCard 
                            title="Organize Spending"
                            description="Group expenses into categories such as food, travel, shopping, bills, and more."
                        />

                        <FeatureCard 
                            title="Understand Your Money"
                            description="Use your dashboard to see total spending, category breakdowns, and recent activity."
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="rounded-2xl bg-gray-900 px-6 py-10 text-center sm:px-10 sm:py-14">
                    
                    <h2 className="text-2xl font-bold text-white sm:text-3xl">
                        {isLoggedIn
                            ? 'Ready to review your spending?'
                            : 'Ready to start tracking?'}
                    </h2>

                    <p className="mx-auto mt-3 max-w-xl text-gray-300">
                        {isLoggedIn
                            ? 'Open your dashboard to see your latest spending overview.'
                            : 'Create your CoinTrail account and start keeping track of where your money goes.'}
                    </p>

                    <div className="mt-7">
                        <Link
                            to={isLoggedIn ? '/dashboard' : '/register'}
                            className="inline-block rounded-lg bg-white px-6 py-3 font-medium text-gray-900 transition hover:bg-gray-100"
                        >
                            {isLoggedIn
                                ? 'Go to Dashboard'
                                : 'Create your account'}
                        </Link>
                    </div>
                    
                </div>
            </section>
        </main>
    );
}


interface FeatureCardProps {
    title: string;
    description: string;
}

function FeatureCard({
    title,
    description,
}: FeatureCardProps) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
                {description}
            </p>
        </div>
    )
}
export default LandingPage;