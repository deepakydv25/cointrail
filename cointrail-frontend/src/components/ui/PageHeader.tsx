import type { ReactNode } from 'react';

export function PageHeader({ title, description, back, actions }: { title: string; description?: ReactNode; back?: ReactNode; actions?: ReactNode }) {
    return <header className="ct-page-header">
        {back && <div className="ct-page-back">{back}</div>}
        <div className="ct-page-heading"><div><h1>{title}</h1>{description && <p className="ct-description">{description}</p>}</div>
            {actions && <div className="ct-actions">{actions}</div>}</div>
    </header>;
}
