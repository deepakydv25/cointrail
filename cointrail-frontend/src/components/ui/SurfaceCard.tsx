import type { ComponentProps } from 'react';

type Props = ComponentProps<'div'> & { padding?: 'normal' | 'compact' | 'none' };
export function SurfaceCard({ children, padding = 'normal', className = '', ...props }: Props) {
    return <div {...props} className={`ct-card ct-card--${padding} ${className}`}>{children}</div>;
}
