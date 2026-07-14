import { BarChart3, Home, Map, PlusSquare, Rows3, LogOut, Clock } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getAuthenticatedUser } from "../config/users";
import { useAuth } from "../contexts/AuthContext";
import digitalReyLogo from "../assets/digital-rey-logo.svg";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/map", label: "Mapa", icon: Map },
  { to: "/actions", label: "Próximas Ações", icon: Clock },
  { to: "/new", label: "Nova oportunidade", icon: PlusSquare },
  { to: "/opportunities", label: "Registros", icon: Rows3 },
];

export function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(true);
  const currentUser = getAuthenticatedUser() ?? "-";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`app-shell${isMobileMenuVisible ? "" : " mobile-menu-hidden"}`}>
      <div className="app-frame card">
        <header className="app-topbar">
          <div className="app-branding">
            <img src={digitalReyLogo} className="brand-logo brand-logo--app" alt="Digital Rey" />
          </div>
          <div className="cluster">
            <span className="app-status-pill">Operação ativa</span>
            <span className="app-user-pill" title={`Usuário logado: ${currentUser}`}>
              Usuário: {currentUser}
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm"
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
