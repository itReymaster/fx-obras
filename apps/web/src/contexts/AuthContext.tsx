import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { resolveAuthorizedUser } from '../config/users';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
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

  const login = useCallback(async (username: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const resolvedUser = resolveAuthorizedUser(username);

      if (resolvedUser && password === '123@mudar') {
        // Simple token-based auth
        const token = btoa(`${resolvedUser}:${Date.now()}`);
        if (rememberMe) {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', resolvedUser);
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('auth_user');
        } else {
          sessionStorage.setItem('auth_token', token);
          sessionStorage.setItem('auth_user', resolvedUser);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
        setIsAuthenticated(true);
      } else {
        throw new Error('Invalid credentials');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
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
