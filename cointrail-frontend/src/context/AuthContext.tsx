import { useEffect, useSyncExternalStore } from 'react';
import { AuthContext } from './auth-context';
import { getSessionSnapshot, loginSession, logoutSession, monitorSession, subscribeSession } from '../api/session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const session = useSyncExternalStore(subscribeSession, getSessionSnapshot);
    useEffect(monitorSession, []);
    return (
        <AuthContext.Provider value={{
            isAuthenticated: !!session.token, isInitialized: true,
            sessionExpired: session.expired, sessionVersion: session.version,
            login: loginSession, logout: logoutSession,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
