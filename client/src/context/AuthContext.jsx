import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('stackit_token');
    if (!token) { setUser(null); setLoading(false); return null; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data.user);
      return data.data.user;
    } catch {
      localStorage.removeItem('stackit_token');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('stackit_token', data.data.token);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('stackit_token', data.data.token);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('stackit_token');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, refresh: fetchMe, isAdmin: user?.role === 'admin' }), [user, loading, login, register, logout, fetchMe]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
