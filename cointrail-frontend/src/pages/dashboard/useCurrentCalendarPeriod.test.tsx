import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCurrentCalendarPeriod } from './useCurrentCalendarPeriod';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59)); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('rolling browser-local reporting month', () => {
    it('advances at the local year boundary with one timer and no per-minute updates', () => {
        const { result, unmount } = renderHook(() => useCurrentCalendarPeriod(true));
        expect(result.current.period).toEqual({ year: '2026', month: '12' });
        expect(vi.getTimerCount()).toBe(1);
        act(() => vi.advanceTimersByTime(1000));
        expect(result.current.period).toEqual({ year: '2027', month: '1' });
        const stable = result.current.period;
        act(() => vi.advanceTimersByTime(86_400_000));
        expect(result.current.period).toBe(stable);
        expect(vi.getTimerCount()).toBe(1);
        unmount(); expect(vi.getTimerCount()).toBe(0);
    });
    it('rechecks leap-month rollover on focus and visibility resume and cleans up', () => {
        vi.setSystemTime(new Date(2024, 1, 29, 23, 59, 59));
        const windowRemove = vi.spyOn(window, 'removeEventListener');
        const documentRemove = vi.spyOn(document, 'removeEventListener');
        const { result, unmount } = renderHook(() => useCurrentCalendarPeriod(true));
        act(() => { vi.setSystemTime(new Date(2024, 2, 1)); window.dispatchEvent(new Event('focus')); });
        expect(result.current.period).toEqual({ year: '2024', month: '3' });
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        act(() => { vi.setSystemTime(new Date(2024, 3, 1)); document.dispatchEvent(new Event('visibilitychange')); });
        expect(result.current.period.month).toBe('3');
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
        act(() => document.dispatchEvent(new Event('visibilitychange')));
        expect(result.current.period.month).toBe('4');
        unmount();
        expect(windowRemove).toHaveBeenCalledWith('focus', expect.any(Function));
        expect(documentRemove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
        expect(vi.getTimerCount()).toBe(0);
    });
    it('does not monitor explicit periods and rechecks immediately on returning to default mode', () => {
        const { result, rerender } = renderHook(({ enabled }) => useCurrentCalendarPeriod(enabled), { initialProps: { enabled: false } });
        expect(vi.getTimerCount()).toBe(0);
        act(() => { vi.setSystemTime(new Date(2027, 0, 1)); window.dispatchEvent(new Event('focus')); });
        expect(result.current.period.month).toBe('12');
        rerender({ enabled: true });
        expect(result.current.period).toEqual({ year: '2027', month: '1' });
        rerender({ enabled: false }); expect(vi.getTimerCount()).toBe(0);
    });
});
