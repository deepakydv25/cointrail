import { FormField } from '../../components/ui/FormField';
import { months } from '../dashboard/period';
import type { BudgetPeriod } from '../../types/budget';
import type { ApiError } from '../../api/errors';

export function PeriodFields({ value, onChange, error }: { value: BudgetPeriod; onChange: (value: BudgetPeriod) => void; error: ApiError | null }) {
    return <div className="ct-actions">
        <FormField id="year" label="Year" error={error?.fieldErrors.year}>{props => <input {...props} className="ct-control" type="text" inputMode="numeric" required value={value.year} onChange={event => onChange({ ...value, year: event.target.value })} />}</FormField>
        <FormField id="month" label="Month" error={error?.fieldErrors.month}>{props => <select {...props} className="ct-control" required value={value.month} onChange={event => onChange({ ...value, month: event.target.value })}>
            <option value="">Choose a month</option>{months.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}
        </select>}</FormField>
    </div>;
}
