import type { ReactNode } from 'react';

type ControlProps = { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string };
export function FormField({ id, label, hint, error, describedBy, children }: {
    id: string; label: string; hint?: ReactNode; error?: string; describedBy?: string; children: (props: ControlProps) => ReactNode;
}) {
    const descriptions = [describedBy, hint ? `${id}-help` : undefined, error ? `${id}-error` : undefined].filter(Boolean).join(' ');
    return <div className="ct-field"><label htmlFor={id}>{label}</label>
        {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': descriptions || undefined })}
        {hint && <p id={`${id}-help`} className="ct-hint">{hint}</p>}
        {error && <p id={`${id}-error`} className="ct-field-error">{error}</p>}
    </div>;
}
