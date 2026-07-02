import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        const savedUser = localStorage.getItem('scribecare_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('scribecare_user');
            }
        }
        setLoading(false);
    }, []);

    const setUserAndPersist = (userData) => {
        setUser(userData);
        localStorage.setItem('scribecare_user', JSON.stringify(userData));
    };

    const login = async (credentials) => {
        const res = await api.login(credentials);
        api.setToken(res.token);
        setUserAndPersist(res.user);
    };

    const signup = async (data) => {
        const res = await api.signup(data);
        api.setToken(res.token);
        setUserAndPersist(res.user);
    };

    const demoLogin = () => {
        const demoUser = {
            id: 'demo-clinician-1',
            email: 'doctor@hospital.com',
            name: 'Dr. Aisha Patel',
            role: 'clinician',
            org_id: 'demo-org-1',
            org_name: 'City General Hospital',
        };
        api.setToken('demo-token');
        setUserAndPersist(demoUser);
        return { success: true };
    };

    const logout = () => {
        api.clearToken();
        setUser(null);
        localStorage.removeItem('scribecare_user');
        localStorage.removeItem('scribecare_token');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, demoLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export default AuthContext;
