import { BarChart3, Building2, Home, Map, PlusSquare, Rows3 } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { APP_CONFIG } from "../config/app";

const navItems = [
  { to: "#", label: "App", icon: Building2, isLauncher: true },
  { to: "/", label: "Início", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/map", label: "Mapa", icon: Map },
  { to: "/new", label: "Nova oportunidade", icon: PlusSquare },
  { to: "/opportunities", label: "Registros", icon: Rows3 },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <div className="app-frame card">
        <header className="app-topbar">
          <div className="app-branding">
            <button type="button" className="app-launcher" aria-label="Abrir menu de aplicativos">
              <Building2 size={18} />
            </button>
            <div>
              <strong className="app-title">{APP_CONFIG.name}</strong>
              <div className="app-subtitle">{APP_CONFIG.moduleName}</div>
            </div>
          </div>
          <span className="app-status-pill">Operação ativa</span>
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
