import { categoryTypes } from '../types/category';
import type { CategoryType } from '../types/category';
import { FormField } from './ui/FormField';

export default function CategoryTypeSelect({ value, onChange }: { value: CategoryType | ''; onChange: (value: CategoryType | '') => void }) {
    return <FormField id="category-type-filter" label="Category type">{props =>
        <select {...props} className="ct-control" value={value}
            onChange={event => onChange(event.target.value as CategoryType | '')}>
            <option value="">All types</option>{categoryTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>}</FormField>;
}
