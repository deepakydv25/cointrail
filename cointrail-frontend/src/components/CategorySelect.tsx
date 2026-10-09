import type { CategoryResponse, CategoryType } from '../types/category';
import type { ApiError } from '../api/errors';
import { FormField } from './ui/FormField';

// Eligible IDs remain strings; V1 enum selects remain independent.
export default function CategorySelect({ categories, type, value, onChange, id = 'categoryId', error }: {
    categories: CategoryResponse[]; type: CategoryType; value: string; onChange: (value: string) => void; id?: string; error?: ApiError | null;
}) {
    return <FormField id={id} label="Category" error={error?.fieldErrors[id]}>{props => <select {...props} required value={value} onChange={event => onChange(event.target.value)} className="ct-control">
        <option value="">Select {type === 'INCOME' ? 'an income' : 'an expense'} category</option>
        {categories.filter(category => category.active && category.type === type).map(category =>
            <option key={category.id} value={category.id}>{category.name}{category.system ? ' (System)' : ' (Custom)'}</option>)}
    </select>}</FormField>;
}
