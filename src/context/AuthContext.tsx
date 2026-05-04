import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../lib/types';
import { supabase } from '../lib/supabase';

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
        try {
            const { data, error } = await supabase
                .from('erp_state')
                .select('value')
                .eq('key', 'erp_auth_creds')
                .single();

            const creds = data?.value || { username: 'admin', password: 'admin123' };
            
            if (username === creds.username && password === creds.password) {
                const mockUser: User = {
                    id: '1',
                    username: creds.username,
                    name: 'Admin Toko',
                    role: 'admin'
                };
                setUser(mockUser);
                localStorage.setItem('erp_session', JSON.stringify(mockUser));
                
                // Clean up old insecure storage if exists
                localStorage.removeItem('erp_creds');
                return true;
            }
        } catch (e) {
            console.error('Auth error:', e);
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('erp_session');
    };

    const updateCredentials = async (newUsername: string, newPassword?: string): Promise<boolean> => {
        try {
            // Fetch current creds to keep password if newPassword not provided
            const { data } = await supabase
                .from('erp_state')
                .select('value')
                .eq('key', 'erp_auth_creds')
                .single();

            const currentCreds = data?.value || { username: 'admin', password: 'admin123' };
            const updatedCreds = { 
                username: newUsername, 
                password: newPassword || currentCreds.password 
            };
            
            // Save to Cloud
            const { error } = await supabase
                .from('erp_state')
                .upsert({ key: 'erp_auth_creds', value: updatedCreds });

            if (error) throw error;
            
            // Update current session
            if (user) {
                const updatedUser = { ...user, username: newUsername };
                setUser(updatedUser);
                localStorage.setItem('erp_session', JSON.stringify(updatedUser));
            }
            
            localStorage.removeItem('erp_creds');
            return true;
        } catch (e) {
            console.error('Update credentials failed:', e);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateCredentials, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
