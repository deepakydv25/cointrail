import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createCategory, getCategory, updateCategory } from '../../services/categoryService';
import { categoryTypes } from '../../types/category';
import type { CategoryResponse, CategoryType } from '../../types/category';
import { ApiError, normalizeApiError } from '../../api/errors';
import { FieldError, FormError } from '../../components/ui/FormFeedback';
import { ErrorState, LoadingState } from '../../components/ui/States';

export default function CategoryFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [category, setCategory] = useState<CategoryResponse | null>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState<CategoryType>('EXPENSE');
    const [error, setError] = useState<ApiError | null>(null);
    const [loadError, setLoadError] = useState('');
    const [pending, setPending] = useState(false);
    const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        if (!id) return;
        const controller = new AbortController();
        getCategory(id, controller.signal).then(data => {
            if (!controller.signal.aborted) { setCategory(data); setName(data.name); setType(data.type); }
        }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setLoadError(normalizeApiError(error).message);
        });
        return () => controller.abort();
    }, [id]);
    const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3';
    return <main className="mx-auto max-w-xl space-y-6 break-words px-4 py-8">
        <h1 className="text-3xl font-bold">{id ? 'Rename category' : 'Create custom category'}</h1>
        <Link className="text-blue-700 underline" to={id ? `/app/categories/${id}` : '/app/categories'}>Cancel</Link>
        {loadError ? <ErrorState message={loadError} /> : id && !category ? <LoadingState /> : category?.system ?
            <p>System categories are read-only and cannot be renamed or deactivated.</p> :
            <form noValidate className="space-y-5 rounded-xl border border-gray-200 bg-white p-6" onSubmit={async event => {
                event.preventDefault(); if (pending) return; setError(null);
                if (!name.trim() || name.length > 100) {
                    setError(new ApiError('Check your input.', 'validation', 400, { name: 'Enter a name with at most 100 characters.' })); return;
                }
                setPending(true);
                try {
                    const saved = id ? await updateCategory(id, { name }) : await createCategory({ name, type });
                    if (mounted.current) navigate(`/app/categories/${saved.id}`);
                } catch (error) { if (mounted.current && !axios.isCancel(error)) setError(normalizeApiError(error)); }
                finally { if (mounted.current) setPending(false); }
            }}>
                <p>Names must be unique within a type, including system and deactivated custom categories.</p>
                <div><label htmlFor="name">Name</label><input id="name" required maxLength={100} value={name} onChange={event => setName(event.target.value)}
                    aria-invalid={!!error?.fieldErrors.name} aria-describedby="name-error" className={inputClass} /><FieldError field="name" error={error} /></div>
                {id ? <p>Type (immutable): {type}</p> : <div><label htmlFor="type">Type</label><select id="type" value={type} onChange={event => setType(event.target.value as CategoryType)}
                    aria-invalid={!!error?.fieldErrors.type} aria-describedby="type-error" className={inputClass}>
                    {categoryTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select><FieldError field="type" error={error} /></div>}
                <FormError error={error} fields={id ? ['name'] : ['name', 'type']} />
                <button disabled={pending} className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save category'}</button>
            </form>}
    </main>;
}
