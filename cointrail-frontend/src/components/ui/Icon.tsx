export type IconName = 'menu' | 'close' | 'chevron-left' | 'chevron-right' | 'account' | 'tag' | 'transactions' | 'overview' | 'receipt' | 'info' | 'error' | 'logout';

const paths: Record<IconName, string[]> = {
    menu: ['M4 6h16M4 12h16M4 18h16'],
    close: ['m6 6 12 12M18 6 6 18'],
    'chevron-left': ['m14 6-6 6 6 6'],
    'chevron-right': ['m10 6 6 6-6 6'],
    account: ['M3 7h18v13H3zM3 7l9-4 9 4M7 11v5M12 11v5M17 11v5'],
    tag: ['M3 3h8l10 10-8 8L3 11z', 'M7 7h.01'],
    transactions: ['M4 7h15l-4-4M20 17H5l4 4'],
    overview: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
    receipt: ['M5 3l3 2 4-2 4 2 3-2v18l-3-2-4 2-4-2-3 2zM9 9h6M9 13h6'],
    info: ['M12 16v-5M12 7h.01'],
    error: ['M12 8v5M12 17h.01'],
    logout: ['M9 4H4v16h5M10 12h11l-4-4M21 12l-4 4'],
};

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
    return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`ct-icon ${className}`}>
        {(name === 'info' || name === 'error') && <circle cx="12" cy="12" r="9" />}
        {paths[name].map((d, index) => <path key={index} d={d} />)}
    </svg>;
}
