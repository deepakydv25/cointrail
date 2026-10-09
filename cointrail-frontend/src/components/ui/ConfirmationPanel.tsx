import { useLayoutEffect, useId, useRef, type FormEventHandler, type ReactNode, type RefObject } from 'react';
import { Button } from './Button';

export function ConfirmationPanel({ title, children, keepLabel, confirmLabel, pending, onCancel, onConfirm, triggerRef }: {
    title: string; children: ReactNode; keepLabel: string; confirmLabel: string; pending: boolean;
    onCancel: () => void; onConfirm: FormEventHandler<HTMLFormElement>; triggerRef: RefObject<HTMLButtonElement | null>;
}) {
    const id = useId();
    const keep = useRef<HTMLButtonElement>(null);
    // Focus before the user can begin another pointer action; a delayed frame
    // could otherwise move focus between its pointer-down and pointer-up.
    useLayoutEffect(() => { keep.current?.focus(); }, []);
    const cancel = () => { if (pending) return; onCancel(); requestAnimationFrame(() => triggerRef.current?.focus()); };
    return <form aria-labelledby={id} className="ct-confirmation ct-stack" onSubmit={event => { if (pending) event.preventDefault(); else onConfirm(event); }}
        onKeyDown={event => { if (event.key === 'Escape' && !pending) { event.preventDefault(); event.stopPropagation(); cancel(); } }}>
        <h3 id={id}>{title}</h3><div className="ct-stack">{children}</div>
        <div className="ct-actions"><Button ref={keep} variant="secondary" disabled={pending} onClick={cancel}>{keepLabel}</Button>
            <Button type="submit" variant="danger" pending={pending}>{confirmLabel}</Button></div>
    </form>;
}
