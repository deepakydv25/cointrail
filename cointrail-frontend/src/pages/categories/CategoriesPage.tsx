import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button, ButtonLink } from '../../components/ui/Button';
import { getCategories } from '../../services/categoryService';
import type { CategoryResponse, CategoryType } from '../../types/category';
import { normalizeApiError } from '../../api/errors';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import CategoryIcon from '../../components/CategoryIcon';

const categoryTabs: { type: CategoryType; label: string }[] = [{ type: 'EXPENSE', label: 'Expenses' }, { type: 'INCOME', label: 'Income' }];

export default function CategoriesPage() {
    const { state } = useLocation();
    const [categories, setCategories] = useState<CategoryResponse[] | null>(null);
    const [type, setType] = useState<CategoryType>('EXPENSE');
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        getCategories(controller.signal).then(data => { if (!controller.signal.aborted) setCategories(data); }).catch(caught => {
            if (!controller.signal.aborted && !axios.isCancel(caught)) setError(normalizeApiError(caught).message);
        });
        return () => controller.abort();
    }, [attempt]);
    const visible = categories?.filter(category => category.type === type);
    return <main className="ct-page ct-stack">
        <PageHeader title="Categories" actions={<ButtonLink variant="primary" to="/app/categories/create">+ Add category</ButtonLink>} />
        {typeof state?.notice === 'string' && <p role="status">{state.notice}</p>}
        <div className="ct-status-tabs" role="tablist" aria-label="Category type" onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? categoryTabs[(categoryTabs.findIndex(tab => tab.type === type) + 1) % categoryTabs.length]
                : event.key === 'ArrowLeft' ? categoryTabs[(categoryTabs.findIndex(tab => tab.type === type) + categoryTabs.length - 1) % categoryTabs.length]
                    : event.key === 'Home' ? categoryTabs[0] : event.key === 'End' ? categoryTabs.at(-1) : undefined;
            if (next && next.type) { event.preventDefault(); setType(next.type); document.getElementById(`category-tab-${next.type.toLowerCase()}`)?.focus(); }
        }}>{categoryTabs.map(tab => <Button key={tab.type} id={`category-tab-${tab.type.toLowerCase()}`} variant={type === tab.type ? 'primary' : 'ghost'} role="tab" tabIndex={type === tab.type ? 0 : -1} aria-selected={type === tab.type} aria-controls="category-list-panel" onClick={() => setType(tab.type)}>{tab.label}</Button>)}</div>
        {error ? <ErrorState appearance="clarity" message={error} onRetry={() => { setError(''); setCategories(null); setAttempt(attempt + 1); }} />
            : !visible ? <LoadingState appearance="clarity" message="Loading categories…" />
            : visible.length === 0 ? <EmptyState appearance="clarity" title={`No ${type === 'EXPENSE' ? 'expense' : 'income'} categories`}>Add a custom category to organize your {type.toLowerCase()} transactions.</EmptyState>
            : <SurfaceCard padding="none" id="category-list-panel" role="tabpanel" aria-labelledby={`category-tab-${type.toLowerCase()}`}><ul className="ct-resource-list ct-category-list">{visible.map(category => <li key={category.id} className="ct-resource-row">
                <CategoryIcon name={category.name} type={category.type} system={category.system} size="small" />
                <div className="ct-resource-row-main"><Link className="ct-resource-row-title" to={`/app/categories/${category.id}`}>{category.name}</Link></div>
                <span className={`ct-category-kind ${category.system ? 'ct-category-kind--system' : ''}`}>{category.system ? 'System · Read-only' : 'Custom'}</span>
            </li>)}</ul></SurfaceCard>}
    </main>;
}
