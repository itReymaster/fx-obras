import { Building2, Clock3, Plus, Rows3, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    { label: "Alto potencial", value: dashboard?.highPotential ?? 0, icon: Rows3 },
    { label: "Ação vencida", value: dashboard?.overdueNextAction ?? 0, icon: Clock3 },
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
        <div className="home-actions home-actions--focus">
          <Link className="btn btn-primary btn-link home-cta-new" to="/new">
            <Plus size={18} /> Registrar nova oportunidade
          </Link>
          <Link className="btn btn-secondary btn-link" to="/opportunities">
            <Rows3 size={18} /> Ver registros
          </Link>
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
