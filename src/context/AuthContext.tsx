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
        // Check active sessions and sets the user
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    username: session.user.email?.split('@')[0] || 'user',
                    name: session.user.user_metadata?.name || 'User',
                    role: session.user.user_metadata?.role || 'admin'
                });
            }
            setIsLoading(false);
        };

        initAuth();

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    username: session.user.email?.split('@')[0] || 'user',
                    name: session.user.user_metadata?.name || 'User',
                    role: session.user.user_metadata?.role || 'admin'
                });
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            return true;
        } catch (e) {
            console.error('Auth error:', e);
            return false;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const updateCredentials = async (newEmail: string, newPassword?: string): Promise<boolean> => {
        try {
            const updates: any = { email: newEmail };
            if (newPassword) updates.password = newPassword;
            
            const { error } = await supabase.auth.updateUser(updates);
            if (error) throw error;
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
