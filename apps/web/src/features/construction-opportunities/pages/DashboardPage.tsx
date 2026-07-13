import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate } from "../../../utils/format";
import { opportunitiesApi } from "../services/opportunities-api";

interface DashboardData {
  total: number;
  last30: number;
  highPotential: number;
  notEvaluated: number;
  overdueNextAction: number;
  notSentToCrm: number;
  latest: Array<{ id: string; title: string; code: string; capturedAt: string }>;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    void opportunitiesApi.dashboard().then(setData);
  }, []);

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

  return (
    <div className="page grid">
      <header className="page-header">
        <h2 className="page-title">Dashboard executivo</h2>
        <p className="page-subtitle">Visão consolidada da operação para acompanhar volume, prioridade e conversão.</p>
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
