import { Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { APP_CONFIG } from "../../../config/app";
import { AUTHORIZED_USER_OPTIONS } from "../../../config/users";
import { addressLabel, formatDate, formatUserDisplay, resolvePhotoPath } from "../../../utils/format";
import {
  commercialPotentialOptions,
  constructionStageOptions,
  labels,
  statusOptions,
} from "../../../utils/labels";
import { opportunitiesApi } from "../services/opportunities-api";
import type { Opportunity, OpportunityListResponse } from "../types/opportunity.types";

type LocationTuple = {
  state: string | null;
  city: string | null;
  district: string | null;
};

export function OpportunityListPage() {
  type TestFilterMode = "real_only" | "test_only" | "all";

  const [items, setItems] = useState<Opportunity[]>([]);
  const [locations, setLocations] = useState<LocationTuple[]>([]);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("");
  const [constructionStage, setConstructionStage] = useState("");
  const [commercialPotential, setCommercialPotential] = useState("");
  const [createdByUserId, setCreatedByUserId] = useState("");
  const [sortBy, setSortBy] = useState("most_recent");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [testFilterMode, setTestFilterMode] = useState<TestFilterMode>("real_only");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState<OpportunityListResponse["pagination"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const allLocationData = useMemo(() => {
    const map = new Map<string, LocationTuple>();
    const add = (s?: string | null, c?: string | null, d?: string | null) => {
      const stateTrimmed = s?.trim().toUpperCase() || null;
      const cityTrimmed = c?.trim() || null;
      const districtTrimmed = d?.trim() || null;
      if (!stateTrimmed && !cityTrimmed && !districtTrimmed) return;
      const key = `${stateTrimmed ?? ""}::${(cityTrimmed ?? "").toLowerCase()}::${(districtTrimmed ?? "").toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, { state: stateTrimmed, city: cityTrimmed, district: districtTrimmed });
      }
    };

    locations.forEach((l) => add(l.state, l.city, l.district));
    items.forEach((item) => add(item.state, item.city, item.district));
    return Array.from(map.values());
  }, [locations, items]);

  const stateOptions = useMemo(() => {
    const set = new Set<string>();
    allLocationData.forEach((l) => {
      if (l.state) set.add(l.state);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [allLocationData]);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    allLocationData.forEach((l) => {
      if (!l.city) return;
      if (state && l.state && l.state !== state) return;
      set.add(l.city);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [allLocationData, state]);

  const districtOptions = useMemo(() => {
    const set = new Set<string>();
    allLocationData.forEach((l) => {
      if (!l.district) return;
      if (state && l.state && l.state !== state) return;
      if (city && l.city && l.city.toLowerCase() !== city.toLowerCase()) return;
      set.add(l.district);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [allLocationData, state, city]);

  const load = (overrides?: {
    search?: string;
    state?: string;
    city?: string;
    district?: string;
    status?: string;
    constructionStage?: string;
    commercialPotential?: string;
    createdByUserId?: string;
    sortBy?: string;
    testFilterMode?: TestFilterMode;
    page?: number;
    pageSize?: number;
  }) => {
    const applied = {
      search,
      state,
      city,
      district,
      status,
      constructionStage,
      commercialPotential,
      createdByUserId,
      sortBy,
      testFilterMode,
      page,
      pageSize,
      ...overrides,
    };

    const isTestParam =
      applied.testFilterMode === "all"
        ? undefined
        : applied.testFilterMode === "test_only";

    setIsLoading(true);

    void opportunitiesApi
      .list({
        page: applied.page ?? 1,
        pageSize: applied.pageSize ?? 50,
        search: applied.search,
        state: applied.state,
        city: applied.city,
        district: applied.district,
        status: applied.status,
        constructionStage: applied.constructionStage,
        commercialPotential: applied.commercialPotential,
        createdByUserId: applied.createdByUserId,
        sortBy: applied.sortBy,
        isTest: isTestParam,
      })
      .then((response) => {
        setItems(response.data);
        setPagination(response.pagination);
        setPage(response.pagination.page);
        setPageSize(response.pagination.pageSize);
      })
      .finally(() => setIsLoading(false));
  };

  const handleStateChange = (newState: string) => {
    setState(newState);
    let nextCity = city;
    let nextDistrict = district;

    if (newState && city) {
      const cityBelongs = allLocationData.some(
        (l) => l.city?.toLowerCase() === city.toLowerCase() && l.state === newState,
      );
      if (!cityBelongs) {
        nextCity = "";
        nextDistrict = "";
        setCity("");
        setDistrict("");
      }
    }

    if (newState && nextDistrict) {
      const districtBelongs = allLocationData.some(
        (l) => l.district?.toLowerCase() === nextDistrict.toLowerCase() && l.state === newState,
      );
      if (!districtBelongs) {
        nextDistrict = "";
        setDistrict("");
      }
    }

    load({ state: newState, city: nextCity, district: nextDistrict, page: 1 });
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    let nextState = state;
    let nextDistrict = district;

    if (newCity) {
      if (!nextState) {
        const matchingStates = Array.from(
          new Set(
            allLocationData
              .filter((l) => l.city?.toLowerCase() === newCity.toLowerCase() && l.state)
              .map((l) => l.state!),
          ),
        );
        if (matchingStates.length === 1) {
          nextState = matchingStates[0];
          setState(nextState);
        }
      }

      if (nextDistrict) {
        const districtBelongs = allLocationData.some(
          (l) =>
            l.district?.toLowerCase() === nextDistrict.toLowerCase() &&
            l.city?.toLowerCase() === newCity.toLowerCase(),
        );
        if (!districtBelongs) {
          nextDistrict = "";
          setDistrict("");
        }
      }
    } else {
      nextDistrict = "";
      setDistrict("");
    }

    load({ state: nextState, city: newCity, district: nextDistrict, page: 1 });
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    let nextCity = city;
    let nextState = state;

    if (newDistrict) {
      if (!nextCity) {
        const matchingCities = Array.from(
          new Set(
            allLocationData
              .filter((l) => l.district?.toLowerCase() === newDistrict.toLowerCase() && l.city)
              .map((l) => l.city!),
          ),
        );
        if (matchingCities.length === 1) {
          nextCity = matchingCities[0];
          setCity(nextCity);
        }
      }
      if (!nextState && nextCity) {
        const matchingStates = Array.from(
          new Set(
            allLocationData
              .filter((l) => l.city?.toLowerCase() === nextCity.toLowerCase() && l.state)
              .map((l) => l.state!),
          ),
        );
        if (matchingStates.length === 1) {
          nextState = matchingStates[0];
          setState(nextState);
        }
      }
    }

    load({ state: nextState, city: nextCity, district: newDistrict, page: 1 });
  };

  const hasActiveFilters = Boolean(
    search || state || city || district || status || constructionStage || commercialPotential || createdByUserId || testFilterMode !== "real_only",
  );

  const activeFiltersCount = [
    search,
    state,
    city,
    district,
    status,
    constructionStage,
    commercialPotential,
    createdByUserId,
    testFilterMode !== "real_only" ? "testMode" : "",
  ].filter(Boolean).length;

  const paginationSummary = pagination
    ? {
        start: pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1,
        end: Math.min(pagination.page * pagination.pageSize, pagination.totalItems),
      }
    : null;

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Excluir esta obra? Esta ação remove o registro da listagem.");
    if (!confirmDelete) return;

    await opportunitiesApi.remove(id);
    load();
  };

  const clearFilters = () => {
    const defaults = {
      search: "",
      state: "",
      city: "",
      district: "",
      status: "",
      constructionStage: "",
      commercialPotential: "",
      createdByUserId: "",
      sortBy: "most_recent",
      testFilterMode: "real_only" as TestFilterMode,
    };

    setSearch(defaults.search);
    setState(defaults.state);
    setCity(defaults.city);
    setDistrict(defaults.district);
    setStatus(defaults.status);
    setConstructionStage(defaults.constructionStage);
    setCommercialPotential(defaults.commercialPotential);
    setCreatedByUserId(defaults.createdByUserId);
    setSortBy(defaults.sortBy);
    setTestFilterMode(defaults.testFilterMode);

    load(defaults);
  };

  useEffect(() => {
    load();
    opportunitiesApi
      .getLocations()
      .then((data) => {
        if (Array.isArray(data)) {
          setLocations(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const filtersOpen = isDesktop ? desktopFiltersOpen : mobileFiltersOpen;

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

          <button
            type="button"
            className="btn btn-ghost filters-mobile-toggle"
            onClick={() => setMobileFiltersOpen((value) => !value)}
            aria-expanded={mobileFiltersOpen}
          >
            <SlidersHorizontal size={16} />
            {mobileFiltersOpen ? "Fechar opções" : "Abrir opções"}
            {activeFiltersCount > 0 && <span className="filters-mobile-count">({activeFiltersCount})</span>}
          </button>

          <button
            type="button"
            className="btn btn-ghost filters-desktop-toggle"
            onClick={() => setDesktopFiltersOpen((value) => !value)}
            aria-expanded={desktopFiltersOpen}
          >
            <SlidersHorizontal size={16} />
            {desktopFiltersOpen ? "Recolher filtros" : "Expandir filtros"}
            {activeFiltersCount > 0 && <span className="filters-mobile-count">({activeFiltersCount})</span>}
          </button>
        </div>

        <div className={`filters-collapsible ${filtersOpen ? "is-open" : "is-closed"}`}>
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
              UF
              <select
                className="select"
                value={state}
                onChange={(event) => handleStateChange(event.target.value)}
              >
                <option value="">Todos</option>
                {stateOptions.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              Cidade
              <select
                className="select"
                value={city}
                onChange={(event) => handleCityChange(event.target.value)}
              >
                <option value="">{state ? `Todas (${state})` : "Todas"}</option>
                {cityOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              Bairro
              <select
                className="select"
                value={district}
                onChange={(event) => handleDistrictChange(event.target.value)}
              >
                <option value="">{city ? `Todos (${city})` : "Todos"}</option>
                {districtOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
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
                  {AUTHORIZED_USER_OPTIONS.map((user) => (
                    <option key={user.value} value={user.value}>
                      {user.label}
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
                <option value="district">Bairro</option>
                <option value="commercialPotential">Potencial comercial</option>
                <option value="nextActionDate">Data da próxima ação</option>
              </select>
            </label>
          </div>

          <div className="filters-footer">
            <label className="filter-field filters-test-toggle">
              Registros de teste
              <select
                className="select"
                value={testFilterMode}
                onChange={(event) => setTestFilterMode(event.target.value as TestFilterMode)}
              >
                <option value="real_only">Somente reais</option>
                <option value="test_only">Somente teste</option>
                <option value="all">Todos</option>
              </select>
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
              {pagination ? `${pagination.totalItems} obra(s) encontrada(s)` : `${items.length} obra(s) encontrada(s)`}
            </div>
          </div>
        </div>
      </section>
      {pagination && pagination.totalPages > 1 && (
        <section className="card surface-card" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="muted">
            {paginationSummary ? `Exibindo ${paginationSummary.start}-${paginationSummary.end} de ${pagination.totalItems} obras` : `${items.length} obras carregadas`}
          </div>
          <div className="cluster" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => load({ page: 1, pageSize })}
              disabled={page === 1 || isLoading}
            >
              Primeira
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => load({ page: Math.max(1, page - 1), pageSize })}
              disabled={page === 1 || isLoading}
            >
              Anterior
            </button>
            <span className="muted">Página {page} de {pagination.totalPages}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => load({ page: Math.min(pagination.totalPages, page + 1), pageSize })}
              disabled={page >= pagination.totalPages || isLoading}
            >
              Próxima
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => load({ page: pagination.totalPages, pageSize })}
              disabled={page >= pagination.totalPages || isLoading}
            >
              Última
            </button>
          </div>
        </section>
      )}
      {view === "table" && isDesktop ? (
        <section className="card surface-card table-shell">
          <table className="table-full table-opportunities">
            <thead>
              <tr>
                <th>Título</th>
                <th>Endereço</th>
                <th>Bairro</th>
                <th>Cidade</th>
                <th>Status</th>
                <th>Potencial</th>
                <th>Próxima ação</th>
                <th>Captura</th>
                <th>Usuário</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="table-row-opportunity">
                  <td className="table-cell-title"><Link to={`/opportunities/${item.id}`}>{item.title}</Link></td>
                  <td className="table-cell-address">{addressLabel(item)}</td>
                  <td className="table-cell-district">{item.district ?? "-"}</td>
                  <td className="table-cell-city">{item.city ?? "-"}/{item.state ?? "-"}</td>
                  <td className="table-cell-status"><span className="badge">{labels.status(item.status)}</span></td>
                  <td className="table-cell-potential"><span className="badge badge-secondary">{labels.commercialPotential(item.commercialPotential)}</span></td>
                  <td className="table-cell-action" title={item.nextAction ?? undefined}>{item.nextAction ? `${item.nextAction.slice(0, 20)}...` : "-"}</td>
                  <td className="table-cell-date">{formatDate(item.capturedAt)}</td>
                  <td className="table-cell-user">{formatUserDisplay(item.createdByUserId)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        void handleDelete(item.id);
                      }}
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  </td>
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
              <article className="card pad-12 stack-sm" key={item.id}>
                <Link to={`/opportunities/${item.id}`} aria-label={`Abrir obra ${item.title}`}>
                  <div
                    style={{
                      borderRadius: 10,
                      background: "var(--color-primary-soft)",
                      height: 136,
                      backgroundImage: photo
                        ? `url(${APP_CONFIG.uploadsBaseUrl}/${resolvePhotoPath(photo)})`
                        : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                </Link>
                <strong>
                  <Link to={`/opportunities/${item.id}`}>{item.title}</Link>
                </strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {addressLabel(item)}{item.district && item.street ? ` • ${item.district}` : ""}
                </div>
                <div className="cluster">
                  <span className="badge">{labels.status(item.status)}</span>
                  <span className="badge">{labels.commercialPotential(item.commercialPotential)}</span>
                  <span className="badge">{labels.addressSource(item.addressSource)}</span>
                  {item.isTest && <span className="badge-test">✨ Teste</span>}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {item.photos.length} foto(s) - {formatDate(item.capturedAt)} - {formatUserDisplay(item.createdByUserId)}
                </div>
                <div className="cluster">
                  <Link className="btn btn-ghost btn-sm" to={`/opportunities/${item.id}`}>
                    Abrir
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      void handleDelete(item.id);
                    }}
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
