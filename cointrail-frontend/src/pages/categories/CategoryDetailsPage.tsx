import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deactivateCategory, getCategory } from '../../services/categoryService';
import type { CategoryResponse } from '../../types/category';
import { normalizeApiError } from '../../api/errors';
import { ErrorState, LoadingState } from '../../components/ui/States';

export default function CategoryDetailsPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [category, setCategory] = useState<CategoryResponse | null>(null);
    const [error, setError] = useState('');
    const [confirm, setConfirm] = useState(false);
    const [pending, setPending] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const deactivateButton = useRef<HTMLButtonElement>(null);
    const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        const controller = new AbortController();
        getCategory(id, controller.signal).then(data => { if (!controller.signal.aborted) setCategory(data); }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setError(normalizeApiError(error).message);
        });
        return () => controller.abort();
    }, [id, attempt]);
    return <main className="mx-auto max-w-xl space-y-6 break-words px-4 py-8">
        <h1 className="text-3xl font-bold">Category details</h1><Link className="text-blue-700 underline" to="/app/categories">Back to categories</Link>
        {error && <ErrorState message={error} onRetry={!category ? () => { setError(''); setAttempt(attempt + 1); } : undefined} />}
        {!category ? !error && <LoadingState /> : <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold">{category.name}</h2><p>Type (immutable): {category.type}</p>
            <p>{category.system ? 'System · Read-only' : 'Custom'}</p>
            <p className="text-sm text-gray-600">Created: {category.createdAt}<br />Updated: {category.updatedAt}</p>
            {category.system ? <p>System categories cannot be renamed or deactivated.</p> : <>
                <Link className="inline-block rounded border px-4 py-3 text-blue-700" to={`/app/categories/${category.id}/edit`}>Rename category</Link>
                <button ref={deactivateButton} hidden={confirm} className="ml-3 rounded border px-4 py-3 text-red-700" onClick={() => setConfirm(true)}>Deactivate category</button>
                {confirm && <form className="space-y-3 rounded border border-red-200 p-4" onSubmit={async event => {
                    event.preventDefault(); if (pending) return; setPending(true); setError('');
                    try {
                        await deactivateCategory(category.id);
                        if (mounted.current) navigate('/app/categories', { state: { notice: 'Category deactivated. Financial history is preserved.' } });
                    }
                    catch (error) { if (mounted.current && !axios.isCancel(error)) setError(normalizeApiError(error).message); }
                    finally { if (mounted.current) setPending(false); }
                }}>
                    <h3 className="font-semibold">Deactivate {category.name}?</h3>
                    <p>Existing financial history remains. This category will leave the active list and cannot be selected for new transactions. Its name and type remain reserved. There is no restore action.</p>
                    <button autoFocus disabled={pending} type="button" className="rounded border px-4 py-3" onClick={() => {
                        setConfirm(false); requestAnimationFrame(() => deactivateButton.current?.focus());
                    }}>Keep category active</button>
                    <button disabled={pending} className="ml-3 rounded bg-red-600 px-4 py-3 text-white">{pending ? 'Deactivating…' : 'Confirm deactivation'}</button>
                </form>}
            </>}
        </section>}
    </main>;
}
