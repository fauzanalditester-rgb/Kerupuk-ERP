import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../lib/types';

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    updateCredentials: (newUsername: string, newPassword: string) => Promise<boolean>;
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
        try {
            const storedUser = localStorage.getItem('erp_session');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.error('Failed to parse session:', e);
            localStorage.removeItem('erp_session');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        const storedCreds = JSON.parse(localStorage.getItem('erp_creds') || '{"username":"admin","password":"admin123"}');
        
        if (username === storedCreds.username && password === storedCreds.password) {
            const mockUser: User = {
                id: '1',
                username: storedCreds.username,
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

    const updateCredentials = async (newUsername: string, newPassword: string): Promise<boolean> => {
        try {
            const creds = { username: newUsername, password: newPassword };
            localStorage.setItem('erp_creds', JSON.stringify(creds));
            
            // Update current session if logged in
            if (user) {
                const updatedUser = { ...user, username: newUsername };
                setUser(updatedUser);
                localStorage.setItem('erp_session', JSON.stringify(updatedUser));
            }
            return true;
        } catch (e) {
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateCredentials, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
