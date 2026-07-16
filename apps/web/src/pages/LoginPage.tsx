import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, BarChart3, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import reymasterLogo from '../assets/reymaster-logo.svg';
import { APP_CONFIG } from '../config/app';

const REMEMBERED_USERNAME_KEY = 'remembered_username';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBERED_USERNAME_KEY)?.trim() ?? '';
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleForgotPassword = () => {
    window.alert('Esqueceu a senha? Fale com o administrador para redefinir o acesso.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password, rememberMe);

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username.trim());
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }

      navigate('/');
    } catch (err) {
      setError('Usuário ou senha incorretos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-layout">
      {/* Hero Section - Left Side */}
      <div className="login-hero">
        <div className="login-hero-content">
          <div className="login-hero-logo">
            <img src={reymasterLogo} className="brand-logo brand-logo--hero brand-logo--reymaster" alt="Reymaster" />
          </div>

          <div className="login-hero-value">
            <h3 className="hero-title">Obras reais, resultados sustentáveis</h3>
            <p className="hero-description">
              Planeje com dados confiáveis, priorize oportunidades com impacto e acompanhe cada etapa da prospecção com clareza.
            </p>
          </div>

          <div className="login-hero-features">
            <div className="feature-item">
              <CheckCircle size={20} className="feature-icon" />
              <div>
                <h4 className="feature-title">Banco de Dados Completo</h4>
                <p className="feature-desc">Milhares de oportunidades atualizadas em tempo real</p>
              </div>
            </div>
            <div className="feature-item">
              <MapPin size={20} className="feature-icon" />
              <div>
                <h4 className="feature-title">Mapa Interativo</h4>
                <p className="feature-desc">Visualize e filtre obras por localização geográfica</p>
              </div>
            </div>
            <div className="feature-item">
              <BarChart3 size={20} className="feature-icon" />
              <div>
                <h4 className="feature-title">Análise Estratégica</h4>
                <p className="feature-desc">Dashboard com insights e métricas de mercado</p>
              </div>
            </div>
          </div>

          <div className="login-hero-footer">
            <p className="footer-text">
              © 2026 Digital Rey. Obras reais com inteligência comercial responsável.
            </p>
          </div>
        </div>
        <div className="login-hero-background" />
      </div>

      {/* Login Form - Right Side */}
      <div className="login-form-container">
        <div className="login-shell">
          {/* Logo and Branding */}
          <div className="login-header">
            <img src={reymasterLogo} className="brand-logo brand-logo--header brand-logo--reymaster" alt="Reymaster" />
            <p className="login-mobile-kicker">Acesso interno</p>
            <h1 className="login-product-title">Prospecção de Obras</h1>
            <p className="login-product-subtitle">Entre para acompanhar obras, funil e operação comercial.</p>
          </div>

          <div className="login-form-panel">
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username" className="form-label">
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

              <div className="login-options-row">
                <label className="checkbox-label login-remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    disabled={isLoading}
                  />
                  Lembrar-me
                </label>
                <button
                  type="button"
                  className="login-link-button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </form>

            {/* Help Text - Desktop Only */}
            <div className="login-footer login-footer-desktop">
              <p className="login-help">
                Senha padrão: 123@mudar
              </p>
            </div>
          </div>

          <p className="login-version" aria-label={`Versão ${APP_CONFIG.version}`}>
            v{APP_CONFIG.version}
          </p>
        </div>
      </div>
    </div>
  );
};
