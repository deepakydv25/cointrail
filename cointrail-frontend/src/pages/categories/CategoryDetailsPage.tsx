import CategoryIcon from '../../components/CategoryIcon';
import { ConfirmationPanel } from '../../components/ui/ConfirmationPanel';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button, ButtonLink } from '../../components/ui/Button';
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
    return <main className="ct-page ct-page--narrow">
        <PageHeader title="Category details" back={<Link to="/app/categories">Back to categories</Link>} />
        {error && <ErrorState appearance="clarity" message={error} onRetry={!category ? () => { setError(''); setAttempt(attempt + 1); } : undefined} />}
        {!category ? !error && <LoadingState appearance="clarity" /> : <SurfaceCard className="ct-stack">
            <div className="ct-category-heading"><CategoryIcon name={category.name} type={category.type} system={category.system} /><h2>{category.name}</h2></div><p>Type (immutable): {category.type}</p>
            <p>{category.system ? 'System · Read-only' : 'Custom'}</p>
            <p className="ct-meta ct-description">Created: {category.createdAt}<br />Updated: {category.updatedAt}</p>
            {category.system ? <p>System categories cannot be renamed or deactivated.</p> : <>
                <ButtonLink to={`/app/categories/${category.id}/edit`}>Rename category</ButtonLink>
                <Button ref={deactivateButton} hidden={confirm} variant="danger" onClick={() => setConfirm(true)}>Deactivate category</Button>
                {confirm && <ConfirmationPanel title={`Deactivate ${category.name}?`} keepLabel="Keep category active" confirmLabel={pending ? 'Deactivating…' : 'Confirm deactivation'} pending={pending} triggerRef={deactivateButton} onCancel={() => setConfirm(false)} onConfirm={async event => {
                    event.preventDefault(); if (pending) return; setPending(true); setError('');
                    try {
                        await deactivateCategory(category.id);
                        if (mounted.current) navigate('/app/categories', { state: { notice: 'Category deactivated. Financial history is preserved.' } });
                    }
                    catch (error) { if (mounted.current && !axios.isCancel(error)) setError(normalizeApiError(error).message); }
                    finally { if (mounted.current) setPending(false); }
                }}>
                    <p>Existing financial history remains. This category will leave the active list and cannot be selected for new transactions. Its name and type remain reserved. There is no restore action.</p>
                </ConfirmationPanel>}
            </>}
        </SurfaceCard>}
    </main>;
}
