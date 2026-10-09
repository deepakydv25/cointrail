import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { ButtonLink } from '../../components/ui/Button';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { getCategories } from '../../services/categoryService';
import type { CategoryResponse, CategoryType } from '../../types/category';
import { normalizeApiError } from '../../api/errors';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import CategoryTypeSelect from '../../components/CategoryTypeSelect';
import CategoryIcon from '../../components/CategoryIcon';

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
    return <main className="ct-page">
        <PageHeader title="Categories" description="Active system and custom categories. System categories are read-only. Category type cannot be changed after creation."
            actions={<><ButtonLink variant="primary" to="/app/categories/create">Create custom category</ButtonLink><ButtonLink to="/app/accounts">Set up accounts first</ButtonLink></>} />
        {typeof state?.notice === 'string' && <p role="status">{state.notice}</p>}
        <CategoryTypeSelect value={type} onChange={setType} />
        {error ? <ErrorState appearance="clarity" message={error} onRetry={() => { setError(''); setCategories(null); setAttempt(attempt + 1); }} />
            : !visible ? <LoadingState appearance="clarity" message="Loading categories…" />
            : visible.length === 0 ? <EmptyState appearance="clarity" title="No active categories">Create a custom category or choose another type.</EmptyState>
            : <ul className="ct-grid">{visible.map(category => <li key={category.id}><SurfaceCard className="ct-stack">
                <div className="ct-category-heading"><CategoryIcon /><Link className="ct-row-title" to={`/app/categories/${category.id}`}>{category.name}</Link></div>
                <p>{category.type} · <span className="ct-badge">{category.system ? 'System · Read-only' : 'Custom'}</span></p>
            </SurfaceCard>
            </li>)}</ul>}
    </main>;
}
