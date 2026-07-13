import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, MapPin, BarChart3, CheckCircle } from 'lucide-react';
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
    <div className="login-layout">
      {/* Hero Section - Left Side */}
      <div className="login-hero">
        <div className="login-hero-content">
          <div className="login-hero-logo">
            <div className="logo-badge">
              <Target size={32} />
            </div>
            <div>
              <h2 className="logo-name">{APP_CONFIG.name}</h2>
              <p className="logo-tagline">Inteligência em Prospecção</p>
            </div>
          </div>

          <div className="login-hero-value">
            <h3 className="hero-title">Descubra oportunidades de obras em tempo real</h3>
            <p className="hero-description">
              Acesse informações detalhadas sobre projetos de construção, análise geográfica e oportunidades de negócio.
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
              © 2026 Digital Rey. Plataforma líder em prospecção de obras.
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
            <div className="login-icon">
              <Target size={40} />
            </div>
            <h1 className="login-title">{APP_CONFIG.name}</h1>
            <p className="login-subtitle">{APP_CONFIG.moduleName}</p>
          </div>

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
        </form>

          {/* Help Text */}
          <div className="login-footer">
            <p className="login-help">
              Use as credenciais fornecidas para acessar a plataforma
            </p>
          </div>

          {/* Mobile Mini Hero */}
          <div className="login-mobile-hero">
            <h2 className="mini-hero-title">{APP_CONFIG.name}</h2>
            <p className="mini-hero-tagline">{APP_CONFIG.moduleName}</p>
            
            <div className="mini-hero-features">
              <div className="mini-feature">
                <div className="mini-feature-dot" />
                <p className="mini-feature-text">Banco de dados completo de oportunidades</p>
              </div>
              <div className="mini-feature">
                <div className="mini-feature-dot" />
                <p className="mini-feature-text">Análise geográfica e insights de mercado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
