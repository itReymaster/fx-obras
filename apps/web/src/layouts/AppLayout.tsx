import { BarChart3, Clock, Database, Grid3X3, Handshake, Home, LogOut, Map, PlusSquare, Rows3, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { APP_CONFIG } from "../config/app";
import { getAuthenticatedUser } from "../config/users";
import { useAuth } from "../contexts/AuthContext";
import { formatUserDisplay } from "../utils/format";
import reymasterLogo from "../assets/reymaster-logo.svg";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/map", label: "Mapa", icon: Map },
  { to: "/actions", label: "Próximas Ações", icon: Clock },
  { to: "/new", label: "Nova oportunidade", icon: PlusSquare },
  { to: "/opportunities", label: "Registros", icon: Rows3 },
];

type LauncherItem = {
  label: string;
  description: string;
  to?: string;
  icon: ComponentType<{ size?: number }>;
  disabled?: boolean;
};

const appLauncherSections: Array<{ title: string; items: LauncherItem[] }> = [
  {
    title: "Operação",
    items: [
      { label: "Dashboard", description: "Visão executiva da operação", to: "/dashboard", icon: BarChart3 },
      { label: "Registros", description: "Consulta e gestão das obras", to: "/opportunities", icon: Rows3 },
      { label: "Mapa", description: "Cobertura territorial e densidade", to: "/map", icon: Map },
      { label: "Próximas ações", description: "Agenda comercial e follow-up", to: "/actions", icon: Clock },
      { label: "Nova oportunidade", description: "Captura rápida em campo", to: "/new", icon: PlusSquare },
    ],
  },
  {
    title: "Plataforma",
    items: [
      { label: "Parcerias", description: "Ecossistema de parceiros para obras", to: "/partnerships", icon: Handshake },
      { label: "Analytics Salesforce", description: "Em breve", icon: Sparkles, disabled: true },
      { label: "Editor SQL", description: "Em breve", icon: Database, disabled: true },
    ],
  },
];

export function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(true);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [launcherSearch, setLauncherSearch] = useState("");
  const [launcherHighlightedIndex, setLauncherHighlightedIndex] = useState(0);
  const currentUser = formatUserDisplay(getAuthenticatedUser());
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const launcherSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isLauncherOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!launcherRef.current?.contains(target)) {
        setIsLauncherOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLauncherOpen(false);
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isLauncherOpen]);

  useEffect(() => {
    const handleLauncherShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsLauncherOpen((value) => {
          const nextValue = !value;
          if (nextValue) {
            setLauncherHighlightedIndex(0);
          }
          return nextValue;
        });
      }
    };

    window.addEventListener("keydown", handleLauncherShortcut);

    return () => {
      window.removeEventListener("keydown", handleLauncherShortcut);
    };
  }, []);

  useEffect(() => {
    if (!isLauncherOpen) return;
    const input = launcherSearchInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [isLauncherOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const normalizedLauncherSearch = launcherSearch.trim().toLowerCase();
  const filteredLauncherSections = appLauncherSections
    .map((section) => {
      if (!normalizedLauncherSearch) return section;
      const items = section.items.filter((item) => {
        const searchable = `${item.label} ${item.description}`.toLowerCase();
        return searchable.includes(normalizedLauncherSearch);
      });
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
  const hasLauncherResults = filteredLauncherSections.length > 0;
  const actionableLauncherItems = filteredLauncherSections.flatMap((section) =>
    section.items
      .filter((item): item is LauncherItem & { to: string } => !item.disabled && Boolean(item.to))
      .map((item) => ({ ...item, id: `${section.title}-${item.label}` })),
  );

  useEffect(() => {
    if (!isLauncherOpen) return;
    if (actionableLauncherItems.length === 0) {
      setLauncherHighlightedIndex(-1);
      return;
    }

    setLauncherHighlightedIndex((currentIndex) => {
      if (currentIndex < 0 || currentIndex >= actionableLauncherItems.length) {
        return 0;
      }
      return currentIndex;
    });
  }, [actionableLauncherItems.length, isLauncherOpen]);

  const handleLauncherSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsLauncherOpen(false);
      return;
    }

    if (actionableLauncherItems.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setLauncherHighlightedIndex((currentIndex) => (currentIndex + 1) % actionableLauncherItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setLauncherHighlightedIndex((currentIndex) =>
        (currentIndex - 1 + actionableLauncherItems.length) % actionableLauncherItems.length,
      );
      return;
    }

    if (event.key === "Enter" && launcherHighlightedIndex >= 0) {
      event.preventDefault();
      const selectedItem = actionableLauncherItems[launcherHighlightedIndex];
      if (!selectedItem?.to) return;
      setIsLauncherOpen(false);
      navigate(selectedItem.to);
    }
  };

  return (
    <div className={`app-shell${isMobileMenuVisible ? "" : " mobile-menu-hidden"}`}>
      <div className="app-frame card">
        <header className="app-topbar">
          <div className="app-branding">
            <img src={reymasterLogo} className="brand-logo brand-logo--app" alt="Reymaster" />
            <div className="app-brand-copy">
              <div className="app-brand-title">{APP_CONFIG.name}</div>
              <div className="app-brand-subtitle">{APP_CONFIG.moduleName}</div>
            </div>
          </div>
          <div className="app-topbar-actions">
            <div className="app-topbar-meta">
              <span className="app-status-pill">Operação ativa</span>
              <span className="app-user-pill" title={`Usuário logado: ${currentUser}`}>
                <span className="app-user-pill-label">Usuário:</span>
                <span className="app-user-pill-name">{currentUser}</span>
              </span>
            </div>
            <div className="app-launcher-wrap" ref={launcherRef}>
              <button
                type="button"
                className="app-launcher"
                title="Abrir launcher de apps (Ctrl+K)"
                aria-label="Abrir launcher de apps (Ctrl+K)"
                aria-expanded={isLauncherOpen}
                onClick={() => {
                  setIsLauncherOpen((value) => {
                    const nextValue = !value;
                    if (nextValue) {
                      setLauncherHighlightedIndex(0);
                    }
                    return nextValue;
                  });
                }}
              >
                {isLauncherOpen ? <X size={17} /> : <Grid3X3 size={17} />}
              </button>

              {isLauncherOpen && (
                <div className="app-launcher-panel" role="dialog" aria-label="Launcher de apps">
                  <label className="app-launcher-search-field">
                    <span className="app-launcher-search-label">Buscar apps</span>
                    <input
                      ref={launcherSearchInputRef}
                      className="input app-launcher-search-input"
                      value={launcherSearch}
                      onChange={(event) => setLauncherSearch(event.target.value)}
                      onKeyDown={handleLauncherSearchKeyDown}
                      placeholder="Ex.: mapa, dashboard, sql..."
                      aria-label="Buscar apps no launcher"
                      autoFocus
                    />
                  </label>

                  {hasLauncherResults ? (
                    (() => {
                      let actionableIndex = -1;

                      return filteredLauncherSections.map((section) => (
                        <section key={section.title} className="app-launcher-section">
                          <h4 className="app-launcher-title">{section.title}</h4>
                          <div className="app-launcher-grid">
                            {section.items.map((item) => {
                              const Icon = item.icon;

                              if (item.disabled || !item.to) {
                                return (
                                  <div key={item.label} className="app-launcher-item is-disabled" aria-disabled="true">
                                    <span className="app-launcher-item-icon"><Icon size={16} /></span>
                                    <span className="app-launcher-item-body">
                                      <span className="app-launcher-item-label">{item.label}</span>
                                      <span className="app-launcher-item-description">{item.description}</span>
                                    </span>
                                  </div>
                                );
                              }

                              actionableIndex += 1;
                              const isHighlighted = actionableIndex === launcherHighlightedIndex;

                              return (
                                <Link
                                  key={item.label}
                                  to={item.to}
                                  className={`app-launcher-item${isHighlighted ? " is-highlighted" : ""}`}
                                  aria-selected={isHighlighted}
                                  onMouseEnter={() => setLauncherHighlightedIndex(actionableIndex)}
                                  onClick={() => setIsLauncherOpen(false)}
                                >
                                  <span className="app-launcher-item-icon"><Icon size={16} /></span>
                                  <span className="app-launcher-item-body">
                                    <span className="app-launcher-item-label">{item.label}</span>
                                    <span className="app-launcher-item-description">{item.description}</span>
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </section>
                      ));
                    })()
                  ) : (
                    <div className="app-launcher-empty">
                      Nenhum app encontrado para "{launcherSearch.trim()}".
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm app-logout-button"
              title="Sair"
              aria-label="Sair da aplicação"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <nav className="app-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `app-nav-link${isActive ? " is-active" : ""}`}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        {isMobileMenuVisible && (
          <nav className="app-mobile-nav">
            <button
              type="button"
              className="btn btn-ghost btn-sm app-mobile-nav-toggle"
              onClick={() => setIsMobileMenuVisible(false)}
              aria-label="Recolher menu"
              title="Recolher menu"
            >
              <Rows3 size={14} />
              Recolher menu
            </button>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `app-nav-link${isActive ? " is-active" : ""}`}
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        )}
        <button
          type="button"
          className={`btn btn-secondary btn-sm app-mobile-menu-fab ${isMobileMenuVisible ? "is-visible-state" : "is-hidden-state"}`}
          onClick={() => setIsMobileMenuVisible((value) => !value)}
          aria-label={isMobileMenuVisible ? "Ocultar menu" : "Mostrar menu"}
          title={isMobileMenuVisible ? "Ocultar menu" : "Mostrar menu"}
        >
          <Rows3 size={15} />
          {isMobileMenuVisible ? "Ocultar menu" : "Mostrar menu"}
        </button>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
