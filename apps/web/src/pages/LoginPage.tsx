import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/app';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Usuário ou senha incorretos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-shell">
        {/* Logo and Branding */}
        <div className="login-header">
          <div className="login-icon">
            <Building2 size={40} />
          </div>
          <h1 className="login-title">{APP_CONFIG.name}</h1>
          <p className="login-subtitle">{APP_CONFIG.moduleName}</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              <Mail size={16} />
              Usuário
            </label>
            <input
              id="username"
              type="text"
              className="input login-input"
              placeholder="adm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <Lock size={16} />
              Senha
            </label>
            <input
              id="password"
              type="password"
              className="input login-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="btn btn-primary login-button"
          >
            {isLoading ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>

        {/* Help Text */}
        <div className="login-footer">
          <p className="login-help">
            Use as credenciais fornecidas para acessar a plataforma
          </p>
        </div>
      </div>

      {/* Background decoration */}
      <div className="login-background" />
    </div>
  );
};
