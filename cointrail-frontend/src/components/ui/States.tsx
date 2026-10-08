import type { ReactNode } from 'react';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
    return <p role="status" aria-live="polite" className="p-4 text-gray-600">{message}</p>;
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
    return <section className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {children && <div className="mt-2 text-gray-600">{children}</div>}
    </section>;
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
        <p>{message}</p>
        {onRetry && <button type="button" onClick={onRetry} className="mt-2 rounded border px-3 py-2 font-medium">Try again</button>}
    </div>;
}
