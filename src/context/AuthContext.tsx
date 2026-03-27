import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../lib/types';

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('erp_session');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        // Mock authentication: accepting any non-empty password for simplicity
        // For production, this should call an API and use proper password hashing
        if (username === 'admin' && password === 'admin123') {
            const mockUser: User = {
                id: '1',
                username: 'admin',
                name: 'Admin Toko',
                role: 'admin'
            };
            setUser(mockUser);
            localStorage.setItem('erp_session', JSON.stringify(mockUser));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('erp_session');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
