import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

/** Native modality keeps the underlying application inert and traps focus. */
export default function MobileNavigationDrawer({ children, onDismiss, dialog }: {
    children: ReactNode; onDismiss: () => void; dialog: RefObject<HTMLDialogElement | null>;
}) {
    const close = useRef<HTMLButtonElement>(null);
    useLayoutEffect(() => {
        const element = dialog.current!;
        const previousOverflow = document.body.style.overflow;
        const previousPadding = document.body.style.paddingRight;
        const scrollbar = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollbar > 0) document.body.style.paddingRight = `${(parseFloat(getComputedStyle(document.body).paddingRight) || 0) + scrollbar}px`;
        element.showModal();
        close.current?.focus();
        return () => {
            element.close();
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingRight = previousPadding;
        };
    }, [dialog]);
    return createPortal(<dialog ref={dialog} className="ct-mobile-drawer ct-auth-ui" aria-labelledby="mobile-navigation-title"
        onKeyDown={event => {
            if (event.key !== 'Tab') return;
            const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')];
            const first = controls[0], last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}
        onCancel={event => { event.preventDefault(); onDismiss(); }}
        onClick={event => {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) onDismiss();
        }}>
        <div className="ct-drawer-header"><h2 id="mobile-navigation-title">Navigation</h2>
            <Button ref={close} variant="ghost" size="icon" aria-label="Close navigation" onClick={onDismiss}><Icon name="close" /></Button>
        </div>
        {children}
    </dialog>, document.body);
}
