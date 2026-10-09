import { useEffect, useState } from 'react';
import axios from 'axios';
import { getDashboard } from '../../services/dashboardService';
import { currentPeriod } from '../dashboard/period';
import { Button } from '../../components/ui/Button';

// Context only: never infer worker enablement or gate writes on this read.
export function RecurringClockContext() {
    const [attempt, setAttempt] = useState(0); const [result, setResult] = useState<{ attempt: number; date?: string; timezone?: string; failed?: boolean } | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        getDashboard(currentPeriod(), controller.signal).then(data => { if (!controller.signal.aborted) setResult({ attempt, date: data.pendingRecurringTransactions.asOfDate, timezone: data.pendingRecurringTransactions.timezone }); }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setResult({ attempt, failed: true });
        }); return () => controller.abort();
    }, [attempt]);
    const current = result?.attempt === attempt ? result : null;
    return <div className="ct-stack"><p className="ct-description">{current?.date ? `Server date when retrieved: ${current.date} (${current.timezone}). This context may become stale; the server validates the start date when saving.` : current?.failed ? 'Server date context is unavailable. You can still submit; the backend validates today in its recurring timezone.' : 'Loading optional server date context. It is not required to save.'}</p>
        <div className="ct-actions"><Button variant="secondary" onClick={() => setAttempt(attempt + 1)}>Refresh date context</Button></div>
    </div>;
}
