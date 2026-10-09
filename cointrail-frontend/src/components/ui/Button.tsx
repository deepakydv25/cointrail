import type { ComponentProps } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Presentation = { variant?: Variant; size?: 'normal' | 'icon' };
function classes(variant: Variant, size: 'normal' | 'icon', className: string) {
    return `ct-button ct-button--${variant} ct-button--${size} ${className}`;
}
export function Button({ variant = 'primary', size = 'normal', pending = false, disabled, type = 'button', className = '', ...props }:
    ComponentProps<'button'> & Presentation & { pending?: boolean }) {
    return <button {...props} type={type} disabled={disabled || pending} aria-busy={pending || undefined} className={classes(variant, size, className)} />;
}
export function ButtonLink({ variant = 'secondary', size = 'normal', className = '', ...props }: LinkProps & Presentation) {
    return <Link {...props} className={classes(variant, size, className)} />;
}
