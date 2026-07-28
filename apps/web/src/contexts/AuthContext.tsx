import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { resolveAuthorizedUser } from '../config/users';
import { authApi } from '../services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean, provider?: "internal" | "erp-flex") => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string, rememberMe = false, provider: "internal" | "erp-flex" = "erp-flex") => {
    setIsLoading(true);
    try {
      const storage = rememberMe ? localStorage : sessionStorage;
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      const resolvedUser = resolveAuthorizedUser(username);

      if (provider === 'internal') {
        if (!resolvedUser || password !== '123@mudar') {
          throw new Error('INVALID_INTERNAL_CREDENTIALS');
        }

        const token = btoa(`${resolvedUser}:${Date.now()}`);

        storage.setItem('auth_token', token);
        otherStorage.setItem('auth_token', token);
        storage.setItem('auth_user', resolvedUser);
        otherStorage.setItem('auth_user', resolvedUser);
        storage.removeItem('auth_user_id');
        otherStorage.removeItem('auth_user_id');
        storage.setItem('auth_username', resolvedUser);
        otherStorage.setItem('auth_username', resolvedUser);
        storage.removeItem('auth_user_email');
        otherStorage.removeItem('auth_user_email');

        setIsAuthenticated(true);
        return;
      }

      const response = await authApi.loginWithErpFlex(username, password);
      const displayUser = response.user.name?.trim() || response.user.username;

      storage.setItem('auth_token', response.token);
      otherStorage.setItem('auth_token', response.token);
      storage.setItem('auth_user', displayUser);
      otherStorage.setItem('auth_user', displayUser);
      storage.setItem('auth_user_id', String(response.user.id));
      otherStorage.setItem('auth_user_id', String(response.user.id));
      storage.setItem('auth_username', response.user.username);
      otherStorage.setItem('auth_username', response.user.username);

      if (response.user.email) {
        storage.setItem('auth_user_email', response.user.email);
        otherStorage.setItem('auth_user_email', response.user.email);
      } else {
        storage.removeItem('auth_user_email');
        otherStorage.removeItem('auth_user_email');
      }

      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_user_id');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_user_email');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_user_id');
    sessionStorage.removeItem('auth_username');
    sessionStorage.removeItem('auth_user_email');
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
