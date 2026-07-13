import { BarChart3, Target, Home, Map, PlusSquare, Rows3, LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { APP_CONFIG } from "../config/app";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { to: "#", label: "App", icon: Target, isLauncher: true },
  { to: "/", label: "Início", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/map", label: "Mapa", icon: Map },
  { to: "/new", label: "Nova oportunidade", icon: PlusSquare },
  { to: "/opportunities", label: "Registros", icon: Rows3 },
];

export function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <div className="app-frame card">
        <header className="app-topbar">
          <div className="app-branding">
            <button type="button" className="app-launcher" aria-label="Abrir menu de aplicativos">
              <Target size={18} />
            </button>
            <div>
              <strong className="app-title">{APP_CONFIG.name}</strong>
              <div className="app-subtitle">{APP_CONFIG.moduleName}</div>
            </div>
          </div>
          <div className="cluster">
            <span className="app-status-pill">Operação ativa</span>
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
            if (item.isLauncher) {
              return null;
            }
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
        <nav className="app-mobile-nav">
          {navItems.slice(1).map((item) => {
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
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
