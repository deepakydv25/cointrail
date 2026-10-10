import { useState, type ReactNode } from 'react';
import Navbar from './Navbar';

export default function AppShell({ children }: { children: ReactNode }) {
    const [expanded, setExpanded] = useState(false);
    return <div className={`ct-shell${expanded ? ' ct-shell--navigation-expanded' : ''}`}>
        <Navbar appearance="clarity" expanded={expanded} onToggle={() => setExpanded(previous => !previous)} />
        <div className="ct-content">{children}</div>
    </div>;
}
