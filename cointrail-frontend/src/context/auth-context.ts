import { createContext } from 'react';

export interface AuthContextType {
    isAuthenticated: boolean;
    isInitialized: boolean;
    sessionExpired: boolean;
    sessionVersion: number;
    login: (token: string) => void;
    logout: () => void;
}
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
