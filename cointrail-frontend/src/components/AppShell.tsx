import { useState, type ReactNode } from 'react';
import Navbar from './Navbar';

export default function AppShell({ children }: { children: ReactNode }) {
    const [pinned, setPinned] = useState(false);
    return <div className={`ct-shell${pinned ? ' ct-shell--navigation-pinned' : ''}`}>
        <Navbar appearance="clarity" pinned={pinned} onPin={() => setPinned(previous => !previous)} />
        <div className="ct-content">{children}</div>
    </div>;
}
