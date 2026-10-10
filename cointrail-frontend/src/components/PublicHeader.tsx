import { useEffect, useState, type ComponentProps } from 'react';

/** One public header geometry and scroll treatment; callers retain their navigation. */
export default function PublicHeader({ children, className = '', ...navigationProps }: ComponentProps<'nav'>) {
    const [scrolled, setScrolled] = useState(() => window.scrollY > 8);
    useEffect(() => {
        const update = () => setScrolled(previous => {
            const next = window.scrollY > 8;
            return previous === next ? previous : next;
        });
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);
    return <header className={`ct-public-header ct-glass-header ${className}${scrolled ? ' ct-glass-header--scrolled' : ''}`}>
        <nav {...navigationProps} className="ct-public-header-container" aria-label="Primary navigation">{children}</nav>
    </header>;
}
