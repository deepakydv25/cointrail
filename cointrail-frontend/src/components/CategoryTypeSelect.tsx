import { categoryTypes } from '../types/category';
import type { CategoryType } from '../types/category';

export default function CategoryTypeSelect({ value, onChange }: { value: CategoryType | ''; onChange: (value: CategoryType | '') => void }) {
    return <div><label htmlFor="category-type-filter">Category type</label>
        <select id="category-type-filter" className="ml-3 rounded border bg-white px-4 py-3" value={value}
            onChange={event => onChange(event.target.value as CategoryType | '')}>
            <option value="">All types</option>{categoryTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select></div>;
}
