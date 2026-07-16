import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, BarChart3, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import reymasterLogo from '../assets/reymaster-logo.svg';
import { APP_CONFIG } from '../config/app';

const REMEMBERED_USERNAME_KEY = 'remembered_username';
const REMEMBERED_PASSWORD_KEY = 'remembered_password';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallShortcut, setShowInstallShortcut] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const syncAutofilledInputs = () => {
    const userValue = usernameInputRef.current?.value ?? '';
    const passValue = passwordInputRef.current?.value ?? '';

    if (userValue && userValue !== username) {
      setUsername(userValue);
    }

    if (passValue && passValue !== password) {
      setPassword(passValue);
    }
  };

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBERED_USERNAME_KEY)?.trim() ?? '';
    const rememberedPassword = localStorage.getItem(REMEMBERED_PASSWORD_KEY) ?? '';

    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }

    if (rememberedPassword) {
      setPassword(rememberedPassword);
      setRememberMe(true);
    }

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const navWithStandalone = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navWithStandalone.standalone === true;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstallShortcut(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setShowInstallShortcut(false);
    };

    if (isIOS && !isStandalone) {
      setShowInstallShortcut(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Mobile browsers may apply autofill after initial paint without firing onChange.
    const t1 = window.setTimeout(syncAutofilledInputs, 60);
    const t2 = window.setTimeout(syncAutofilledInputs, 240);
    const t3 = window.setTimeout(syncAutofilledInputs, 900);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleForgotPassword = () => {
    window.alert('Esqueceu a senha? Fale com o administrador para redefinir o acesso.');
  };

  const handleInstallShortcut = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
        setShowInstallShortcut(false);
      }
      return;
    }

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIOS) {
      window.alert('No iPhone/iPad: toque no botão Compartilhar do navegador e depois em Adicionar à Tela de Início.');
      return;
    }

    window.alert('Use o menu do navegador e escolha Instalar app ou Adicionar à tela inicial.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Read from DOM refs so browser autofill works even when React state is stale.
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const usernameFromForm = String(formData.get('username') ?? '').trim();
    const passwordFromForm = String(formData.get('password') ?? '');
    const usernameValue = (usernameInputRef.current?.value ?? usernameFromForm ?? username).trim();
    const passwordValue = passwordInputRef.current?.value ?? passwordFromForm ?? password;

    setUsername(usernameValue);
    setPassword(passwordValue);

    if (!usernameValue || !passwordValue) {
      if (!usernameValue && !passwordValue) {
        setError('Informe usuário e senha para continuar');
      } else if (!usernameValue) {
        setError('Informe o usuário para continuar');
      } else {
        setError('Informe a senha para continuar');
      }
      return;
    }

    setIsLoading(true);

    try {
      await login(usernameValue, passwordValue, rememberMe);

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, usernameValue);
        localStorage.setItem(REMEMBERED_PASSWORD_KEY, passwordValue);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
        localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
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
                  name="username"
                  type="text"
                  className="input login-input"
                  placeholder="adm"
                  value={username}
                  ref={usernameInputRef}
                  onChange={(e) => setUsername(e.target.value)}
                  onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
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
                  name="password"
                  type="password"
                  className="input login-input"
                  placeholder="••••••••"
                  value={password}
                  ref={passwordInputRef}
                  onChange={(e) => setPassword(e.target.value)}
                  onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
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
                disabled={isLoading}
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
                  Lembrar senha
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

              {showInstallShortcut && (
                <button
                  type="button"
                  className="btn btn-secondary login-install-button"
                  onClick={handleInstallShortcut}
                  disabled={isLoading}
                >
                  Adicionar atalho na tela inicial
                </button>
              )}
            </form>

            {/* Help Text - Desktop Only */}
            <div className="login-footer login-footer-desktop">
              <p className="login-help">
                Em caso de acesso bloqueado, contate o administrador.
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
