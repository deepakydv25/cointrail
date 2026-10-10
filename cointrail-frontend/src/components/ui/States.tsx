import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export function LoadingState({ message = 'Loading…', appearance = 'classic' }: { message?: string; appearance?: 'classic' | 'clarity' }) {
    return <p role="status" aria-live="polite" className={appearance === 'clarity' ? 'ct-feedback ct-feedback--loading' : 'p-4 text-gray-600'}>{appearance === 'clarity' && <Icon name="info" />}{message}</p>;
}
export function EmptyState({ title, children, appearance = 'classic' }: { title: string; children?: ReactNode; appearance?: 'classic' | 'clarity' }) {
    return <section className={appearance === 'clarity' ? 'ct-feedback ct-feedback--empty' : 'rounded-xl border border-gray-200 bg-white p-6 text-center'}>
        {appearance === 'clarity' && <Icon name="info" />}
        <h2 className={appearance === 'clarity' ? '' : 'text-lg font-semibold text-gray-900'}>{title}</h2>
        {children && <div className={appearance === 'clarity' ? 'ct-description' : 'mt-2 text-gray-600'}>{children}</div>}
    </section>;
}
export function ErrorState({ message, onRetry, appearance = 'classic' }: { message: string; onRetry?: () => void; appearance?: 'classic' | 'clarity' }) {
    return <div role="alert" className={appearance === 'clarity' ? 'ct-feedback ct-feedback--error' : 'rounded-lg bg-red-50 p-4 text-red-700'}>
        <p>{message}</p>
        {onRetry && <Button variant="secondary" onClick={onRetry} className={appearance === 'clarity' ? undefined : 'mt-2'}>Try again</Button>}
    </div>;
}
