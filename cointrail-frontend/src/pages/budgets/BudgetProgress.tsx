import { minorUnits } from '../dashboard/chartData';

export function BudgetProgress({ spent, limit, label, overBudget }: { spent: string; limit: string; label: string; overBudget: boolean }) {
    const planned = minorUnits(limit);
    const basisPoints = planned === 0n ? 0n : minorUnits(spent) * 10000n / planned;
    const percentage = `${basisPoints / 100n}.${String(basisPoints % 100n).padStart(2, '0')}`;
    // Only the bounded visual coordinate becomes Number; monetary strings stay exact.
    const width = Number(basisPoints > 10000n ? 10000n : basisPoints) / 100;
    return <div className={`ct-budget-progress${overBudget ? ' ct-budget-progress--over' : ''}`}>
        <div className="ct-budget-progress-label"><span>Utilization</span><span>{percentage}%</span></div>
        <div className="ct-budget-progress-track" role="progressbar" aria-label={`${label} utilization`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={width}
            aria-valuetext={`${percentage}% utilized${overBudget ? ', over budget' : ''}`}><span style={{ width: `${width}%` }} /></div>
    </div>;
}
