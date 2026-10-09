import type { ApiError } from '../../api/errors';
import { ErrorState } from './States';

export function FormError({ error, fields, appearance = 'classic' }: { error: ApiError | null; fields: string[]; appearance?: 'classic' | 'clarity' }) {
    if (!error) return null;
    const unmatched = Object.entries(error.fieldErrors).filter(([field]) => !fields.includes(field));
    return <>
        <ErrorState message={error.message} appearance={appearance} />
        {unmatched.length > 0 && <ul className={appearance === 'clarity' ? 'ct-field-error' : 'text-sm text-red-700'}>
            {unmatched.map(([field, message]) => <li key={field}>{message}</li>)}
        </ul>}
    </>;
}

export function FieldError({ field, error, appearance = 'classic' }: { field: string; error: ApiError | null; appearance?: 'classic' | 'clarity' }) {
    const message = error?.fieldErrors[field];
    return message ? <p id={`${field}-error`} className={appearance === 'clarity' ? 'ct-field-error' : 'mt-1 text-sm text-red-700'}>{message}</p> : null;
}
