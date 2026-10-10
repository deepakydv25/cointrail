export type IconName = 'menu' | 'close' | 'chevron-left' | 'chevron-right' | 'account' | 'tag' | 'transactions' | 'overview' | 'receipt' | 'info' | 'error' | 'logout' | 'utensils' | 'suitcase' | 'shopping-bag' | 'film' | 'medical' | 'graduation' | 'house' | 'repeat' | 'briefcase' | 'gift' | 'laptop' | 'percent';

const paths: Record<IconName, string[]> = {
    utensils: ['M4 3v6a3 3 0 0 0 6 0V3M7 3v18M18 3c-3 3-3 8 0 9h2V3h-2v18'],
    suitcase: ['M4 7h16v13H4zM9 7V4h6v3M8 7v13M16 7v13'],
    'shopping-bag': ['M4 7h16l1 14H3zM8 9V6a4 4 0 0 1 8 0v3'],
    film: ['M3 4h18v16H3zM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4'],
    medical: ['M9 3h6v6h6v6h-6v6H9v-6H3V9h6z'],
    graduation: ['m2 9 10-5 10 5-10 5zM6 11v6c4 3 8 3 12 0v-6M22 9v8'],
    house: ['m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7'],
    repeat: ['M4 10V6h14l-4-4M20 14v4H6l4 4M4 6l4 4M20 18l-4-4'],
    briefcase: ['M3 7h18v13H3zM8 7V4h8v3M3 12h18M10 12v3h4v-3'],
    gift: ['M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8C4 8 4 2 8 3c3 0 4 5 4 5s1-5 4-5c4-1 4 5-4 5'],
    laptop: ['M5 3h14v13H5zM3 16h18l1 4H2z'],
    percent: ['m5 19 14-14M5 4h4v4H5zM15 16h4v4h-4z'],
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
