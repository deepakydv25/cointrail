import { useCallback, useEffect, useState } from 'react';
import { currentPeriod } from './period';

/** Browser-local calendar only; reporting and recurring server clocks stay separate. */
export function useCurrentCalendarPeriod(enabled: boolean) {
    const [period, setPeriod] = useState(currentPeriod);
    const [monitoring, setMonitoring] = useState(enabled);
    // Refresh before children commit when a long-lived pinned dashboard returns
    // to rolling mode, so it never dispatches a stale default-month request.
    if (monitoring !== enabled) {
        setMonitoring(enabled);
        if (enabled) setPeriod(currentPeriod());
    }
    const recheck = useCallback(() => {
        const next = currentPeriod();
        setPeriod(previous => previous.year === next.year && previous.month === next.month ? previous : next);
        return next;
    }, []);

    useEffect(() => {
        if (!enabled) return;
        let timer: ReturnType<typeof setTimeout>;
        const check = () => {
            clearTimeout(timer);
            recheck();
            const now = new Date();
            const boundary = new Date(now);
            boundary.setDate(1);
            boundary.setMonth(boundary.getMonth() + 1);
            boundary.setHours(0, 0, 0, 0);
            // A month can exceed the browser timer limit; a daily cap also
            // re-evaluates local clock/timezone changes without backend polling.
            timer = setTimeout(check, Math.max(1, Math.min(boundary.getTime() - now.getTime(), 86_400_000)));
        };
        const visible = () => { if (document.visibilityState === 'visible') check(); };
        check();
        window.addEventListener('focus', check);
        document.addEventListener('visibilitychange', visible);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('focus', check);
            document.removeEventListener('visibilitychange', visible);
        };
    }, [enabled, recheck]);

    return { period, recheck };
}
