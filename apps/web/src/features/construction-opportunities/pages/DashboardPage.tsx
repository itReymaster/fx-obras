import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate } from "../../../utils/format";
import { opportunitiesApi } from "../services/opportunities-api";
import type { OpportunityDashboardData } from "../types/opportunity.types";

const formatUserLabel = (userId: string | null) => {
  if (!userId || userId.trim().length === 0) return "Usuario nao identificado";
  return userId.replaceAll("-", " ");
};

export function DashboardPage() {
  const [data, setData] = useState<OpportunityDashboardData | null>(null);
  const [includeTests, setIncludeTests] = useState(false);

  useEffect(() => {
    void opportunitiesApi.dashboard(includeTests).then(setData);
  }, [includeTests]);

  if (!data) {
    return <div className="page">Carregando dashboard...</div>;
  }

  const cards = [
    ["Total", data.total],
    ["Últimos 30 dias", data.last30],
    ["Potencial alto", data.highPotential],
    ["Sem avaliação", data.notEvaluated],
    ["Próxima ação vencida", data.overdueNextAction],
    ["Não enviado ao CRM", data.notSentToCrm],
  ];

  const captureByUser = (data.capturedByUser ?? []).map((item) => ({
    ...item,
    userLabel: formatUserLabel(item.userId),
  }));
  const captureByUserMax = Math.max(1, ...captureByUser.map((item) => item.count));

  return (
    <div className="page grid">
      <header className="page-header">
        <h2 className="page-title">Dashboard executivo</h2>
        <p className="page-subtitle">Visão consolidada da operação para acompanhar volume, prioridade e conversão.</p>
        <label className="checkbox-label" style={{ marginTop: "8px" }}>
          <input
            type="checkbox"
            checked={includeTests}
            onChange={(e) => setIncludeTests(e.target.checked)}
          />
          Incluir registros de teste nos KPIs
        </label>
      </header>
      <section className="metric-grid">
        {cards.map(([label, value]) => (
          <article className="card metric-card" key={label as string}>
            <div className="metric-label">{label as string}</div>
            <strong className="metric-value">{value as number}</strong>
          </article>
        ))}
      </section>
      <section className="card section-card surface-card stack">
        <h3 className="section-title">Captura por usuario</h3>
        <p className="section-note">Ranking de engajamento com volume de obras registradas por pessoa.</p>
        {captureByUser.length === 0 ? (
          <div className="muted hero-note">Sem dados de captura por usuario para o filtro atual.</div>
        ) : (
          <div className="capture-user-list">
            {captureByUser.map((item, index) => (
              <div key={`${item.userId ?? "unknown"}-${index}`} className="capture-user-row">
                <div className="capture-user-row-head">
                  <div className="capture-user-label-wrap">
                    <span className="capture-user-rank">{index + 1}</span>
                    <span className="capture-user-label">{item.userLabel}</span>
                  </div>
                  <span className="capture-user-count">{item.count}</span>
                </div>
                <div className="capture-user-track">
                  <div
                    className="capture-user-fill"
                    style={{ width: `${Math.max(10, (item.count / captureByUserMax) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card section-card surface-card stack">
        <h3 className="section-title">Últimos registros</h3>
        <div className="stack-sm">
          {data.latest.map((item) => (
            <Link key={item.id} to={`/opportunities/${item.id}`} className="recent-record">
              <div className="recent-record__body">
                <strong className="recent-record__title">{item.title}</strong>
                <div className="recent-record__meta">
                  <span className="recent-record__code">{item.code}</span>
                  <span className="recent-record__dot">•</span>
                  <span>{formatDate(item.capturedAt)}</span>
                </div>
              </div>
              <span className="recent-record__action">Abrir</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
