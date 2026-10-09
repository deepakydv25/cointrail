import type { CategoryResponse, CategoryType } from '../types/category';
import type { ApiError } from '../api/errors';

// Eligible IDs remain strings; V1 enum selects remain independent.
export default function CategorySelect({ categories, type, value, onChange, id = 'categoryId', error }: {
    categories: CategoryResponse[]; type: CategoryType; value: string; onChange: (value: string) => void; id?: string; error?: ApiError | null;
}) {
    return <div><label htmlFor={id}>Category</label><select id={id} required value={value} onChange={event => onChange(event.target.value)}
        aria-invalid={!!error?.fieldErrors[id]} aria-describedby={error?.fieldErrors[id] ? `${id}-error` : undefined}
        className="mt-1 w-full rounded-lg border bg-white px-4 py-3">
        <option value="">Select {type === 'INCOME' ? 'an income' : 'an expense'} category</option>
        {categories.filter(category => category.active && category.type === type).map(category =>
            <option key={category.id} value={category.id}>{category.name}{category.system ? ' (System)' : ' (Custom)'}</option>)}
    </select></div>;
}
