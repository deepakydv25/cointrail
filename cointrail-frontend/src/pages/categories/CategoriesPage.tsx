import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { getCategories } from '../../services/categoryService';
import type { CategoryResponse, CategoryType } from '../../types/category';
import { normalizeApiError } from '../../api/errors';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import CategoryTypeSelect from '../../components/CategoryTypeSelect';

export default function CategoriesPage() {
    const { state } = useLocation();
    const [categories, setCategories] = useState<CategoryResponse[] | null>(null);
    const [type, setType] = useState<CategoryType | ''>('');
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        getCategories(controller.signal).then(data => { if (!controller.signal.aborted) setCategories(data); }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setError(normalizeApiError(error).message);
        });
        return () => controller.abort();
    }, [attempt]);
    const visible = categories?.filter(category => !type || category.type === type);
    return <main className="mx-auto max-w-5xl space-y-6 break-words px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        {typeof state?.notice === 'string' && <p role="status">{state.notice}</p>}
        <p>Active system and custom categories. System categories are read-only. Category type cannot be changed after creation.</p>
        <div className="flex flex-wrap gap-4"><Link className="rounded bg-blue-600 px-4 py-3 text-white" to="/app/categories/create">Create custom category</Link>
            <Link className="rounded px-4 py-3 text-blue-700 underline" to="/app/accounts">Set up accounts first</Link></div>
        <CategoryTypeSelect value={type} onChange={setType} />
        {error ? <ErrorState message={error} onRetry={() => { setError(''); setCategories(null); setAttempt(attempt + 1); }} />
            : !visible ? <LoadingState message="Loading categories…" />
            : visible.length === 0 ? <EmptyState title="No active categories">Create a custom category or choose another type.</EmptyState>
            : <ul className="grid gap-4 sm:grid-cols-2">{visible.map(category => <li key={category.id} className="space-y-2 rounded-xl border border-gray-200 bg-white p-5">
                <Link className="text-lg font-semibold text-blue-700 underline" to={`/app/categories/${category.id}`}>{category.name}</Link>
                <p>{category.type} · <span className="rounded bg-gray-100 px-2 py-1 text-sm">{category.system ? 'System · Read-only' : 'Custom'}</span></p>
            </li>)}</ul>}
    </main>;
}
