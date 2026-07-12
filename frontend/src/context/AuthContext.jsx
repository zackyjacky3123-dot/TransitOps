import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'transitops_auth';

function loadStoredAuth() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth);

  const login = useCallback((userPayload) => {
    setAuth(userPayload);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userPayload));
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    window.sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user: auth?.user ?? null,
      role: auth?.user?.role ?? null,
      token: auth?.token ?? null,
      isAuthenticated: Boolean(auth?.token),
      login,
      logout,
    }),
    [auth, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
