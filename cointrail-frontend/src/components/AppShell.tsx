import type { ReactNode } from 'react';
import Navbar from './Navbar';

export default function AppShell({ children }: { children: ReactNode }) {
    return <div className="ct-shell"><Navbar appearance="clarity" /><div className="ct-content">{children}</div></div>;
}
