import { ArrowRight, Building2, Clock3, MapPin, Plus, Rows3, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { APP_CONFIG } from "../../../config/app";
import { formatDate } from "../../../utils/format";
import { opportunitiesApi } from "../services/opportunities-api";

interface HomeDashboardData {
  total: number;
  last30: number;
  highPotential: number;
  overdueNextAction: number;
  statusCounts?: Record<string, number>;
  funnelTotal?: number;
  latest: Array<{ id: string; title: string; code: string; capturedAt: string }>;
}

export function HomePage() {
  const [count, setCount] = useState(0);
  const [dashboard, setDashboard] = useState<HomeDashboardData | null>(null);
  const [includeTests, setIncludeTests] = useState(false);

  useEffect(() => {
    void opportunitiesApi.count().then(setCount).catch(() => setCount(0));
    void opportunitiesApi.dashboard(includeTests).then(setDashboard).catch(() => setDashboard(null));
  }, [includeTests]);

  const cards = [
    { label: "Total cadastrado", value: dashboard?.total ?? count, icon: Building2 },
    { label: "Últimos 30 dias", value: dashboard?.last30 ?? 0, icon: TrendingUp },
    { label: "Alto potencial", value: dashboard?.highPotential ?? 0, icon: ArrowRight },
    { label: "Ação vencida", value: dashboard?.overdueNextAction ?? 0, icon: Clock3 },
  ];

  const signals = [
    { label: "Capta rapido", icon: Sparkles },
    { label: "Mapa ativo", icon: MapPin },
    { label: "Fluxo mobile-first", icon: Rows3 },
  ];

  const funnelStages = [
    { key: "CAPTURED", label: "Capturada" },
    { key: "UNDER_REVIEW", label: "Em analise" },
    { key: "SENT_TO_PROSPECTING", label: "Encaminhada" },
    { key: "PROSPECTING", label: "Em prospeccao" },
    { key: "CONVERTED", label: "Convertida" },
  ] as const;

  const funnelItems = funnelStages.map((stage) => ({
    ...stage,
    count: dashboard?.statusCounts?.[stage.key] ?? 0,
  }));

  const funnelMax = Math.max(1, ...funnelItems.map((stage) => stage.count));
  const funnelTotal =
    dashboard?.funnelTotal ??
    funnelItems.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div className="page grid home-page">
      <section className="card home-hero">
        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <div className="badge hero-badge">
              <Building2 size={16} /> Plataforma comercial
            </div>
            <h1 className="hero-title">{APP_CONFIG.name}</h1>
            <p className="hero-lead">
              Gestão de oportunidades de obras com captura em campo, leitura comercial em tempo real e trilha de acompanhamento para acelerar decisão e conversão.
            </p>

            <div className="home-signal hero-signals">
              {signals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <span key={signal.label} className="home-signal-pill">
                    <Icon size={14} /> {signal.label}
                  </span>
                );
              })}
            </div>

            <div className="home-actions">
              <Link className="btn btn-primary btn-link" to="/new">
                <Plus size={18} /> Registrar oportunidade
              </Link>
              <Link className="btn btn-secondary btn-link" to="/opportunities">
                <Rows3 size={18} /> Ver registros
              </Link>
              <Link className="btn btn-ghost btn-link" to="/map">
                <ArrowRight size={18} /> Abrir mapa
              </Link>
            </div>
          </div>

          <aside className="home-hero-panel surface-card">
            <div className="justify-between">
              <div>
                <div className="eyebrow">Resumo executivo</div>
                <div className="hero-summary-title">Operação comercial ativa</div>
              </div>
              <span className="app-status-pill">{dashboard?.total ?? count} registros</span>
            </div>

            <div className="home-mini-stats">
              <div className="home-mini-stat">
                <div className="home-mini-stat-label">Últimos 30 dias</div>
                <div className="home-mini-stat-value">{dashboard?.last30 ?? 0}</div>
              </div>
              <div className="home-mini-stat">
                <div className="home-mini-stat-label">Alto potencial</div>
                <div className="home-mini-stat-value">{dashboard?.highPotential ?? 0}</div>
              </div>
              <div className="home-mini-stat">
                <div className="home-mini-stat-label">Ação vencida</div>
                <div className="home-mini-stat-value">{dashboard?.overdueNextAction ?? 0}</div>
              </div>
              <div className="home-mini-stat">
                <div className="home-mini-stat-label">Total cadastrado</div>
                <div className="home-mini-stat-value">{dashboard?.total ?? count}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="card section-card surface-card funnel-card">
        <div className="cluster cluster--spread mb-10">
          <div>
            <h3 className="section-title">Funil de Obras</h3>
            <div className="section-note">
              Visao por etapa comercial com quantidade de obras no funil ativo.
            </div>
          </div>
          <span className="funnel-total-pill">{funnelTotal} obras no funil</span>
        </div>

        <div className="funnel-list">
          {funnelItems.map((stage, index) => (
            <div key={stage.key} className="funnel-row">
              <div className="funnel-row-head">
                <div className="funnel-stage">
                  <span className="funnel-stage-index">{index + 1}</span>
                  <span className="funnel-stage-label">{stage.label}</span>
                </div>
                <span className="funnel-stage-count">{stage.count}</span>
              </div>
              <div className="funnel-bar-track">
                <div
                  className="funnel-bar-fill"
                  style={{ width: `${Math.max(10, (stage.count / funnelMax) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-kpis metric-grid">
        <div className="cluster cluster--spread" style={{ gridColumn: "1 / -1", marginBottom: "4px" }}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeTests}
              onChange={(e) => setIncludeTests(e.target.checked)}
            />
            Incluir registros de teste nos KPIs
          </label>
        </div>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="card home-kpi-card metric-card">
              <div className="metric-label">
                <span>{card.label}</span>
                <Icon size={16} />
              </div>
              <strong className="home-kpi-value metric-value">{card.value}</strong>
            </article>
          );
        })}
      </section>

      <section className="card section-card surface-card">
        <div className="cluster cluster--spread mb-10">
          <div>
            <h3 className="section-title">Últimos registros</h3>
            <div className="section-note">
              Atualizações recentes para priorização de obra, auditoria rápida e navegação comercial.
            </div>
          </div>
          <Link to="/opportunities" className="text-link hero-note">
            Ver lista completa
          </Link>
        </div>
        <div className="home-recent-list">
          {(dashboard?.latest ?? []).length === 0 ? (
            <div className="muted hero-note">Nenhum registro recente encontrado.</div>
          ) : (
            (dashboard?.latest ?? []).slice(0, 4).map((item) => (
              <Link key={item.id} to={`/opportunities/${item.id}`} className="home-recent-item">
                <div className="home-recent-title">{item.title}</div>
                <div className="home-recent-meta">
                  {item.code} - {formatDate(item.capturedAt)}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
