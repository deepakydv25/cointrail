import type { ApiError } from '../../api/errors';
import { ErrorState } from './States';

export function FormError({ error, fields }: { error: ApiError | null; fields: string[] }) {
    if (!error) return null;
    const unmatched = Object.entries(error.fieldErrors).filter(([field]) => !fields.includes(field));
    return <>
        <ErrorState message={error.message} />
        {unmatched.length > 0 && <ul className="text-sm text-red-700">
            {unmatched.map(([field, message]) => <li key={field}>{message}</li>)}
        </ul>}
    </>;
}

export function FieldError({ field, error }: { field: string; error: ApiError | null }) {
    const message = error?.fieldErrors[field];
    return message ? <p id={`${field}-error`} className="mt-1 text-sm text-red-700">{message}</p> : null;
}
