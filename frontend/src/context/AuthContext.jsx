import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => ({ user: null, business: null, loading: Boolean(tokenStore.get()) }));

  const logout = useCallback(() => {
    tokenStore.set(null);
    setState({ user: null, business: null, loading: false });
  }, []);

  const applySession = useCallback(({ token, user, business }) => {
    if (token) tokenStore.set(token);
    setState({ user, business: business ?? null, loading: false });
    return user;
  }, []);

  const refresh = useCallback(async () => {
    const data = await api.get('/auth/me');
    setState({ user: data.user, business: data.business, loading: false });
    return data;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (tokenStore.get()) refresh().catch(logout);
  }, [logout, refresh]);

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.user),
      login: async (email, password) => applySession(await api.post('/auth/login', { email, password })),
      registerBusiness: async (payload) => applySession(await api.post('/auth/register/business', payload)),
      registerClient: async (payload) => applySession(await api.post('/auth/register/client', payload)),
      setBusiness: (business) => setState((s) => ({ ...s, business })),
      setUser: (user) => setState((s) => ({ ...s, user })),
      refresh,
      logout,
    }),
    [state, applySession, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export const homeForRole = (role) => (role === 'BUSINESS_ADMIN' ? '/panel' : '/mis-reservas');
