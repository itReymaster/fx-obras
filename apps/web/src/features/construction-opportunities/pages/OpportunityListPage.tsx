import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { APP_CONFIG } from "../../../config/app";
import { AUTHORIZED_USERS } from "../../../config/users";
import { addressLabel, formatDate } from "../../../utils/format";
import {
  commercialPotentialOptions,
  constructionStageOptions,
  labels,
  statusOptions,
} from "../../../utils/labels";
import { opportunitiesApi } from "../services/opportunities-api";
import type { Opportunity } from "../types/opportunity.types";

export function OpportunityListPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [constructionStage, setConstructionStage] = useState("");
  const [commercialPotential, setCommercialPotential] = useState("");
  const [createdByUserId, setCreatedByUserId] = useState("");
  const [sortBy, setSortBy] = useState("most_recent");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [showTestRecords, setShowTestRecords] = useState(false);

  const load = (overrides?: {
    search?: string;
    city?: string;
    status?: string;
    constructionStage?: string;
    commercialPotential?: string;
    createdByUserId?: string;
    sortBy?: string;
    showTestRecords?: boolean;
  }) => {
    const applied = {
      search,
      city,
      status,
      constructionStage,
      commercialPotential,
      createdByUserId,
      sortBy,
      showTestRecords,
      ...overrides,
    };

    void opportunitiesApi
      .list({
        page: 1,
        pageSize: 50,
        search: applied.search,
        city: applied.city,
        status: applied.status,
        constructionStage: applied.constructionStage,
        commercialPotential: applied.commercialPotential,
        createdByUserId: applied.createdByUserId,
        sortBy: applied.sortBy,
        isTest: applied.showTestRecords ? undefined : false,
      })
      .then((response) => setItems(response.data));
  };

  const hasActiveFilters = Boolean(
    search || city || status || constructionStage || commercialPotential || createdByUserId || showTestRecords,
  );

  const clearFilters = () => {
    const defaults = {
      search: "",
      city: "",
      status: "",
      constructionStage: "",
      commercialPotential: "",
      createdByUserId: "",
      sortBy: "most_recent",
      showTestRecords: false,
    };

    setSearch(defaults.search);
    setCity(defaults.city);
    setStatus(defaults.status);
    setConstructionStage(defaults.constructionStage);
    setCommercialPotential(defaults.commercialPotential);
    setCreatedByUserId(defaults.createdByUserId);
    setSortBy(defaults.sortBy);
    setShowTestRecords(defaults.showTestRecords);

    load(defaults);
  };

  useEffect(() => {
    load();
  }, []);

  const isDesktop = useMemo(() => window.innerWidth >= 900, []);

  return (
    <div className="page grid">
      <header className="page-header">
        <h2 className="page-title">Obras registradas</h2>
        <p className="page-subtitle">Filtre, compare e abra registros com uma leitura comercial direta.</p>
      </header>
      {isDesktop && (
        <div className="view-mode-selector">
          <span className="view-mode-label">Visualizar como:</span>
          <div className="view-toggle">
            <button className={`btn btn-sm ${view === "cards" ? "btn-primary" : "btn-ghost"}`} onClick={() => setView("cards")}>Cards</button>
            <button className={`btn btn-sm ${view === "table" ? "btn-primary" : "btn-ghost"}`} onClick={() => setView("table")}>Tabela</button>
          </div>
        </div>
      )}
      <section className="card section-card--compact surface-card filters-panel">
        <div className="filters-topbar">
          <label className="filter-field filter-field--search">
            Pesquisa rápida
            <div className="search-shell">
              <Search size={16} className="search-icon" />
              <input
                className="input search-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Título, código ou observação"
              />
            </div>
          </label>
          <label className="filter-field filter-field--city">
            Cidade
            <input className="input" value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
        </div>

        <div className="status-chip-row" aria-label="Filtros rápidos do funil">
          <button
            type="button"
            className={`status-chip ${status === "" ? "is-active" : ""}`}
            onClick={() => {
              setStatus("");
              load({ status: "" });
            }}
          >
            Todos
          </button>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`status-chip ${status === option.value ? "is-active" : ""}`}
              onClick={() => {
                setStatus(option.value);
                load({ status: option.value });
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="filters-grid filters-grid--opportunities">
          <label className="filter-field">
            Status
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos</option>
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            Estágio da obra
            <select className="select" value={constructionStage} onChange={(event) => setConstructionStage(event.target.value)}>
              <option value="">Todos</option>
              {constructionStageOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            Potencial
            <select className="select" value={commercialPotential} onChange={(event) => setCommercialPotential(event.target.value)}>
              <option value="">Todos</option>
              {commercialPotentialOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            Usuário
            <select className="select" value={createdByUserId} onChange={(event) => setCreatedByUserId(event.target.value)}>
              <option value="">Todos</option>
              {AUTHORIZED_USERS.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            Ordenação
            <select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="most_recent">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="title">Título</option>
              <option value="city">Cidade</option>
              <option value="commercialPotential">Potencial comercial</option>
              <option value="nextActionDate">Data da próxima ação</option>
            </select>
          </label>
        </div>

        <div className="filters-footer">
          <label className="checkbox-label filters-test-toggle">
            <input type="checkbox" checked={showTestRecords} onChange={(event) => setShowTestRecords(event.target.checked)} />
            Incluir registros de teste
          </label>
          <div className="filters-actions filters-actions--desktop-end">
            <button className="btn btn-primary btn-lg" onClick={() => load()}>
              Aplicar filtros
            </button>
            <button className="btn btn-ghost btn-lg" onClick={clearFilters} disabled={!hasActiveFilters}>
              Limpar
            </button>
          </div>
          <div className="filters-summary">
            {items.length} obra(s) encontrada(s)
          </div>
        </div>
      </section>
      {view === "table" && isDesktop ? (
        <section className="card surface-card table-shell">
          <table className="table-full table-opportunities">
            <thead>
              <tr>
                <th>Título</th>
                <th>Endereço</th>
                <th>Cidade</th>
                <th>Status</th>
                <th>Potencial</th>
                <th>Próxima ação</th>
                <th>Captura</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="table-row-opportunity">
                  <td className="table-cell-title"><Link to={`/opportunities/${item.id}`}>{item.title}</Link></td>
                  <td className="table-cell-address">{addressLabel(item)}</td>
                  <td className="table-cell-city">{item.city ?? "-"}/{item.state ?? "-"}</td>
                  <td className="table-cell-status"><span className="badge">{labels.status(item.status)}</span></td>
                  <td className="table-cell-potential"><span className="badge badge-secondary">{labels.commercialPotential(item.commercialPotential)}</span></td>
                  <td className="table-cell-action" title={item.nextAction ?? undefined}>{item.nextAction ? `${item.nextAction.slice(0, 20)}...` : "-"}</td>
                  <td className="table-cell-date">{formatDate(item.capturedAt)}</td>
                  <td className="table-cell-user">{item.createdByUserId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="grid-auto-260">
          {items.map((item) => {
            const photo = item.photos.find((value) => value.isPrimary) ?? item.photos[0];
            return (
              <Link className="card pad-12 stack-sm" key={item.id} to={`/opportunities/${item.id}`}>
                <div
                  style={{
                    borderRadius: 10,
                    background: "var(--color-primary-soft)",
                    height: 136,
                    backgroundImage: photo
                      ? `url(${APP_CONFIG.uploadsBaseUrl}/${photo.relativePath})`
                      : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <strong>{item.title}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {addressLabel(item)}
                </div>
                <div className="cluster">
                  <span className="badge">{labels.status(item.status)}</span>
                  <span className="badge">{labels.commercialPotential(item.commercialPotential)}</span>
                  <span className="badge">{labels.addressSource(item.addressSource)}</span>
                  {item.isTest && <span className="badge-test">✨ Teste</span>}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {item.photos.length} foto(s) - {formatDate(item.capturedAt)} - {item.createdByUserId ?? "Sem usuário"}
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
