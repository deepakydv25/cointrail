import { useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Navbar() {
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
                    className="rounded p-3 text-gray-700 hover:bg-gray-100 md:hidden"
                    aria-label="Toggle navigation menu" aria-expanded={isOpen} aria-controls="primary-navigation">
                    <span aria-hidden="true">{isOpen ? '✕' : '☰'}</span>
                </button>
                <div id="primary-navigation" className={`${isOpen ? 'flex' : 'hidden'} w-full flex-col gap-3 border-t border-gray-200 pt-4 md:flex md:w-auto md:flex-row md:items-center md:border-0 md:pt-0`}>
                    {isAuthenticated ? <>
                        <NavLink to="/app/accounts" className={linkClass} onClick={close}>Accounts</NavLink>
                        <NavLink to="/app/categories" className={linkClass} onClick={close}>Categories</NavLink>
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
