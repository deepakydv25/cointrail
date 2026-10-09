import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button } from '../../components/ui/Button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createCategory, getCategory, updateCategory } from '../../services/categoryService';
import { categoryTypes } from '../../types/category';
import type { CategoryResponse, CategoryType } from '../../types/category';
import { ApiError, normalizeApiError } from '../../api/errors';
import { FormError } from '../../components/ui/FormFeedback';
import { FormField } from '../../components/ui/FormField';
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
    const inputClass = 'ct-control';
    return <main className="ct-page ct-page--narrow">
        <PageHeader title={id ? 'Rename category' : 'Create custom category'} back={<Link to={id ? `/app/categories/${id}` : '/app/categories'}>Cancel</Link>} />
        {loadError ? <ErrorState appearance="clarity" message={loadError} /> : id && !category ? <LoadingState appearance="clarity" /> : category?.system ?
            <p>System categories are read-only and cannot be renamed or deactivated.</p> :
            <SurfaceCard><form noValidate className="ct-stack" onSubmit={async event => {
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
                <FormField id="name" label="Name" error={error?.fieldErrors.name}>{props => <input {...props} required maxLength={100} value={name} onChange={event => setName(event.target.value)} className={inputClass} />}</FormField>
                {id ? <p>Type (immutable): {type}</p> : <FormField id="type" label="Type" error={error?.fieldErrors.type}>{props => <select {...props} value={type} onChange={event => setType(event.target.value as CategoryType)} className={inputClass}>
                    {categoryTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>}</FormField>}
                <FormError appearance="clarity" error={error} fields={id ? ['name'] : ['name', 'type']} />
                <Button type="submit" pending={pending}>{pending ? 'Saving…' : 'Save category'}</Button>
            </form></SurfaceCard>}
    </main>;
}
