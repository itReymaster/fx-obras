import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, BarChart3, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import digitalReyLogo from '../assets/digital-rey-logo.svg';

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
            <img src={digitalReyLogo} className="brand-logo brand-logo--hero" alt="Digital Rey" />
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
            <img src={digitalReyLogo} className="brand-logo brand-logo--header" alt="Digital Rey" />
            <p className="login-mobile-kicker">Plataforma de prospecção orientada por dados</p>
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
            </form>

            {/* Help Text - Desktop Only */}
            <div className="login-footer login-footer-desktop">
              <p className="login-help">
                Senha padrão: 123@mudar
              </p>
            </div>
          </div>

          {/* Mobile Mini Hero - Features Cards */}
          <div className="login-mobile-hero">
            <div className="mini-hero-content-wrapper">
              <h4 className="mini-hero-headline">Digital Rey</h4>
              <p className="mini-hero-description">
                Gestão de oportunidades de obras com captura em campo e leitura comercial em tempo real.
              </p>
              <div className="mini-hero-chips">
                <span className="mini-hero-chip"><CheckCircle size={14} /> Capta rápido</span>
                <span className="mini-hero-chip"><MapPin size={14} /> Mapa ativo</span>
                <span className="mini-hero-chip"><BarChart3 size={14} /> Fluxo mobile-first</span>
              </div>
              <p className="mini-hero-help">Senha padrão: 123@mudar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
