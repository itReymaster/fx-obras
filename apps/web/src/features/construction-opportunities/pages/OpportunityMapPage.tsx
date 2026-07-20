import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { DivIcon, LatLngBounds } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { AUTHORIZED_USER_OPTIONS } from "../../../config/users";
import { formatDate, formatUserDisplay } from "../../../utils/format";
import { labels } from "../../../utils/labels";
import { opportunitiesApi } from "../services/opportunities-api";
import type { Opportunity } from "../types/opportunity.types";

type GeoOpportunity = Opportunity & {
  latitude: number;
  longitude: number;
};

type MappedOpportunity = Opportunity & {
  plotLat: number;
  plotLng: number;
  isApproximate: boolean;
  approximateLevel: "REAL" | "ADDRESS" | "CITY";
};

type CityAggregate = {
  city: string;
  state: string;
  count: number;
};

type FocusTarget = {
  id: string;
  lat: number;
  lng: number;
  zoom: number;
};

type CityCenter = {
  lat: number;
  lng: number;
};

type AddressCenter = {
  lat: number;
  lng: number;
};

type LocationQualityFilter = "ALL" | "REAL" | "ADDRESS" | "CITY";
type MapStyleMode = "GOOGLE" | "STREET" | "SATELLITE";

const statusPalette: Record<string, string> = {
  DRAFT: "var(--color-status-draft)",
  CAPTURED: "var(--color-status-captured)",
  UNDER_REVIEW: "var(--color-status-review)",
  SENT_TO_PROSPECTING: "var(--color-status-sent)",
  PROSPECTING: "var(--color-status-prospecting)",
  CONVERTED: "var(--color-status-converted)",
  DISCARDED: "var(--color-status-discarded)",
};

const approximateColor = "var(--color-status-approximate)";
const heatStrokeColor = "var(--color-map-heat-stroke)";
const heatFillColor = "var(--color-map-heat-fill)";

const statusOrder = [
  "DRAFT",
  "CAPTURED",
  "UNDER_REVIEW",
  "SENT_TO_PROSPECTING",
  "PROSPECTING",
  "CONVERTED",
  "DISCARDED",
] as const;

const defaultCenter: [number, number] = [-14.235, -51.9253];
const markerIconCache = new Map<string, DivIcon>();
const clusterIconCache = new Map<number, DivIcon>();
const MAP_CLUSTER_PREF_KEY = "fx-obras.map.clusterEnabled";

const stateCenters: Record<string, [number, number]> = {
  AC: [-9.97, -67.81],
  AL: [-9.67, -35.74],
  AP: [0.03, -51.06],
  AM: [-3.1, -60.02],
  BA: [-12.97, -38.5],
  CE: [-3.72, -38.54],
  DF: [-15.79, -47.88],
  ES: [-20.31, -40.31],
  GO: [-16.68, -49.25],
  MA: [-2.53, -44.3],
  MT: [-15.6, -56.1],
  MS: [-20.45, -54.61],
  MG: [-19.92, -43.94],
  PA: [-1.46, -48.5],
  PB: [-7.12, -34.88],
  PR: [-25.43, -49.27],
  PE: [-8.05, -34.9],
  PI: [-5.09, -42.8],
  RJ: [-22.9, -43.2],
  RN: [-5.79, -35.21],
  RS: [-30.03, -51.23],
  RO: [-8.76, -63.9],
  RR: [2.82, -60.67],
  SC: [-27.59, -48.55],
  SP: [-23.55, -46.63],
  SE: [-10.91, -37.07],
  TO: [-10.24, -48.35],
};

const hasRealCoordinates = (item: Opportunity): item is GeoOpportunity =>
  typeof item.latitude === "number" &&
  Number.isFinite(item.latitude) &&
  typeof item.longitude === "number" &&
  Number.isFinite(item.longitude);

const normalizeState = (value?: string | null) => value?.trim().toUpperCase() ?? "";

const hashText = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const estimateFromCityState = (city?: string | null, state?: string | null) => {
  const stateKey = normalizeState(state);
  const base = stateCenters[stateKey];
  if (!base) return null;

  const cityLabel = (city ?? "").trim();
  if (!cityLabel) return null;

  const h1 = hashText(`${cityLabel}:${stateKey}`);
  const h2 = hashText(`${stateKey}:${cityLabel}:seed`);

  const latOffset = ((h1 % 1000) / 1000 - 0.5) * 1.2;
  const lngOffset = ((h2 % 1000) / 1000 - 0.5) * 1.2;

  return {
    lat: base[0] + latOffset,
    lng: base[1] + lngOffset,
  };
};

const cityStateLookupKey = (city?: string | null, state?: string | null) =>
  `${(city ?? "").trim().toLowerCase()}::${normalizeState(state)}`;

const addressLookupKey = (item: Opportunity) => {
  return [
    (item.street ?? "").trim().toLowerCase(),
    (item.number ?? "").trim().toLowerCase(),
    (item.district ?? "").trim().toLowerCase(),
    (item.city ?? "").trim().toLowerCase(),
    normalizeState(item.state),
    (item.postalCode ?? "").trim().toLowerCase(),
  ].join("::");
};

const buildAddressQuery = (item: Opportunity) => {
  const parts = [
    item.street,
    item.number,
    item.district,
    item.city,
    normalizeState(item.state),
    item.postalCode,
    "Brasil",
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  return parts.join(", ");
};

const fetchAddressCenter = async (query: string): Promise<AddressCenter | null> => {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "br",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!payload[0]) return null;

  const lat = Number(payload[0].lat);
  const lng = Number(payload[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
};

const fetchCityCenter = async (city: string, state: string): Promise<CityCenter | null> => {
  const params = new URLSearchParams({
    city,
    state,
    country: "Brasil",
    format: "json",
    limit: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!payload[0]) return null;

  const lat = Number(payload[0].lat);
  const lng = Number(payload[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
};

function cityKey(item: Opportunity) {
  return `${item.city ?? "Sem cidade"}::${item.state ?? "-"}`;
}

const leafletMarkerIcon = (color: string) =>
  markerIconCache.get(color) ??
  (() => {
    const icon = new DivIcon({
      className: "opportunity-map-marker",
      html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.2)"></span>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    markerIconCache.set(color, icon);
    return icon;
  })();

const leafletClusterIcon = (cluster: any) => {
  const count = Number(cluster.getChildCount?.() ?? 0);
  if (clusterIconCache.has(count)) {
    return clusterIconCache.get(count) as DivIcon;
  }

  const size = count >= 100 ? 48 : count >= 30 ? 42 : 36;
  const background = count >= 100 ? "#1f4e8a" : count >= 30 ? "#2b6cb0" : "#4d87c6";

  const icon = new DivIcon({
    className: "opportunity-map-cluster",
    html: `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:999px;background:${background};color:#fff;font-weight:700;font-size:12px;border:2px solid rgba(255,255,255,0.95);box-shadow:0 4px 12px rgba(15,23,42,0.25)">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [Math.round(size / 2), Math.round(size / 2)],
  });

  clusterIconCache.set(count, icon);
  return icon;
};

export function OpportunityMapPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedCreator, setSelectedCreator] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [qualityFilter, setQualityFilter] = useState<LocationQualityFilter>("ALL");
  const [mapStyle, setMapStyle] = useState<MapStyleMode>("GOOGLE");
  const [clusterEnabled, setClusterEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(MAP_CLUSTER_PREF_KEY);
    if (raw === "false") return false;
    if (raw === "true") return true;
    return true;
  });
  const [loadError, setLoadError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [fitRequestId, setFitRequestId] = useState(0);
  const [cityCenters, setCityCenters] = useState<Record<string, CityCenter>>({});
  const [addressCenters, setAddressCenters] = useState<Record<string, AddressCenter>>({});

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      try {
        const pageSize = 100;
        const first = await opportunitiesApi.list({ page: 1, pageSize, sortBy: "most_recent" });
        const all = [...first.data];

        for (let page = 2; page <= first.pagination.totalPages; page += 1) {
          const next = await opportunitiesApi.list({ page, pageSize, sortBy: "most_recent" });
          all.push(...next.data);
        }

        setItems(all);
        setLoadError("");
      } catch {
        setItems([]);
        setLoadError("Nao foi possivel carregar as obras para o mapa.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadAll();
  }, []);

  useEffect(() => {
    const unresolved = new Map<string, { city: string; state: string }>();
    const unresolvedAddress = new Map<string, string>();

    for (const item of items) {
      if (hasRealCoordinates(item)) continue;

      const hasAddressCore = Boolean(item.street?.trim() && item.city?.trim() && normalizeState(item.state));
      if (hasAddressCore) {
        const addressKey = addressLookupKey(item);
        if (!addressCenters[addressKey]) {
          unresolvedAddress.set(addressKey, buildAddressQuery(item));
        }
      }

      const city = (item.city ?? "").trim();
      const state = normalizeState(item.state);
      if (!city || !state) continue;

      const key = cityStateLookupKey(city, state);
      if (!cityCenters[key]) {
        unresolved.set(key, { city, state });
      }
    }

    if (unresolved.size === 0 && unresolvedAddress.size === 0) return;

    const loadCenters = async () => {
      const updates: Record<string, CityCenter> = {};
      const addressUpdates: Record<string, AddressCenter> = {};
      const addressEntries = Array.from(unresolvedAddress.entries()).slice(0, 40);
      const cityEntries = Array.from(unresolved.entries()).slice(0, 40);

      for (const [key, query] of addressEntries) {
        try {
          const center = await fetchAddressCenter(query);
          if (center) addressUpdates[key] = center;
        } catch {
          continue;
        }
      }

      for (const [key, value] of cityEntries) {
        try {
          const center = await fetchCityCenter(value.city, value.state);
          if (center) updates[key] = center;
        } catch {
          continue;
        }
      }

      if (Object.keys(addressUpdates).length > 0) {
        setAddressCenters((current) => ({ ...current, ...addressUpdates }));
      }

      if (Object.keys(updates).length > 0) {
        setCityCenters((current) => ({ ...current, ...updates }));
      }
    };

    void loadCenters();
  }, [items, cityCenters, addressCenters]);

  const creatorOptions = useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();
    for (const item of items) {
      const creator = item.createdByUserId?.trim();
      if (!creator) continue;

      const normalized = creator.toLowerCase().replace(/[\s-]+/g, "");
      const canonical = AUTHORIZED_USER_OPTIONS.find((option) => {
        const optionKey = option.value.toLowerCase().replace(/[\s-]+/g, "");
        return optionKey === normalized || option.aliases.some((alias) => alias.toLowerCase().replace(/[\s-]+/g, "") === normalized);
      });

      unique.set(normalized, {
        value: canonical?.value ?? creator,
        label: canonical?.label ?? formatUserDisplay(creator),
      });
    }
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedStatus && item.status !== selectedStatus) return false;
      if (selectedCreator) {
        const creator = (item.createdByUserId ?? "").trim().toLowerCase().replace(/[\s-]+/g, "");
        const selected = selectedCreator.trim().toLowerCase().replace(/[\s-]+/g, "");
        if (creator !== selected) return false;
      }
      if (!normalizedSearch) return true;
      const searchable = [
        item.title,
        item.code,
        item.city,
        item.state,
        item.street,
        item.district,
        item.createdByUserId,
      ]
        .map((value) => (value ?? "").toLowerCase())
        .join(" ");
      return searchable.includes(normalizedSearch);
    });
  }, [items, selectedStatus, selectedCreator, searchText]);

  const mapOpportunities = useMemo<MappedOpportunity[]>(() => {
    return filteredItems
      .map((item) => {
        if (hasRealCoordinates(item)) {
          return {
            ...item,
            plotLat: item.latitude,
            plotLng: item.longitude,
            isApproximate: false,
            approximateLevel: "REAL",
          };
        }

        const estimated = estimateFromCityState(item.city, item.state);
        const addressCenter = addressCenters[addressLookupKey(item)];
        const cityCenter = cityCenters[cityStateLookupKey(item.city, item.state)];
        const approximateBase = addressCenter ?? cityCenter ?? estimated;
        if (!approximateBase) return null;

        const jitterSeed = hashText(item.id);
        const jitterScale = addressCenter ? 0 : 0.12;
        const latJitter = ((jitterSeed % 1000) / 1000 - 0.5) * jitterScale;
        const lngJitter = (((jitterSeed / 1000) % 1000) / 1000 - 0.5) * jitterScale;

        return {
          ...item,
          plotLat: approximateBase.lat + latJitter,
          plotLng: approximateBase.lng + lngJitter,
          isApproximate: true,
          approximateLevel: addressCenter ? "ADDRESS" : "CITY",
        };
      })
      .filter((item): item is MappedOpportunity => item !== null);
  }, [filteredItems, addressCenters, cityCenters]);

  const exactCount = useMemo(() => mapOpportunities.filter((item) => !item.isApproximate).length, [mapOpportunities]);
  const approximateCount = useMemo(() => mapOpportunities.filter((item) => item.isApproximate).length, [mapOpportunities]);

  const visibleMapOpportunities = useMemo(() => {
    if (qualityFilter === "ALL") return mapOpportunities;
    if (qualityFilter === "REAL") return mapOpportunities.filter((item) => !item.isApproximate);
    if (qualityFilter === "ADDRESS") return mapOpportunities.filter((item) => item.approximateLevel === "ADDRESS");
    return mapOpportunities.filter((item) => item.approximateLevel === "CITY");
  }, [mapOpportunities, qualityFilter]);

  const center = useMemo<[number, number]>(() => {
    if (visibleMapOpportunities.length === 0) {
      return defaultCenter;
    }
    const lat = visibleMapOpportunities.reduce((sum, value) => sum + value.plotLat, 0) / visibleMapOpportunities.length;
    const lng = visibleMapOpportunities.reduce((sum, value) => sum + value.plotLng, 0) / visibleMapOpportunities.length;
    return [lat, lng];
  }, [visibleMapOpportunities]);

  const cityAggregates = useMemo<CityAggregate[]>(() => {
    const map = new Map<string, CityAggregate>();
    for (const item of visibleMapOpportunities) {
      const key = cityKey(item);
      const current = map.get(key);
      if (current) {
        current.count += 1;
        continue;
      }
      map.set(key, {
        city: item.city ?? "Sem cidade",
        state: item.state ?? "-",
        count: 1,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [visibleMapOpportunities]);

  const statusTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const key of statusOrder) totals[key] = 0;
    for (const item of filteredItems) {
      totals[item.status] = (totals[item.status] ?? 0) + 1;
    }
    return totals;
  }, [filteredItems]);

  const cityHeatPoints = useMemo(() => {
    const grouped = new Map<string, { latitude: number; longitude: number; count: number }>();
    for (const item of visibleMapOpportunities) {
      const key = cityKey(item);
      const current = grouped.get(key);
      if (current) {
        current.count += 1;
        continue;
      }
      grouped.set(key, { latitude: item.plotLat, longitude: item.plotLng, count: 1 });
    }
    return Array.from(grouped.values());
  }, [visibleMapOpportunities]);

  useEffect(() => {
    if (!focusTarget) return;
    const exists = visibleMapOpportunities.some((item) => item.id === focusTarget.id);
    if (!exists) setFocusTarget(null);
  }, [focusTarget, visibleMapOpportunities]);

  const handleResetViewport = () => {
    setFocusTarget(null);
    setFitRequestId((value) => value + 1);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MAP_CLUSTER_PREF_KEY, String(clusterEnabled));
  }, [clusterEnabled]);

  const recentMapOpportunities = useMemo(() => {
    return [...visibleMapOpportunities]
      .sort((a, b) => {
        const tsA = new Date(a.capturedAt).valueOf();
        const tsB = new Date(b.capturedAt).valueOf();
        if (Number.isNaN(tsA) || Number.isNaN(tsB)) return 0;
        return tsB - tsA;
      })
      .slice(0, 12);
  }, [visibleMapOpportunities]);

  const cityAggregateMax = Math.max(1, ...cityAggregates.map((row) => row.count));
  const statusAggregateMax = Math.max(1, ...statusOrder.map((status) => statusTotals[status] ?? 0));

  return (
    <div className="page grid">
      <header className="page-header">
        <h2 className="page-title">Mapa de obras</h2>
        <p className="page-subtitle">Visualização geográfica e densidade para priorizar cobertura comercial.</p>
      </header>
      <section className="card section-card--compact surface-card stack-sm">
        <div className="justify-between-wrap">
          <div className="map-panel-intro">
            <h3 className="section-title">Visualização geográfica e densidade</h3>
            <p className="section-note">Distribuição das obras para apoiar cobertura comercial e priorização regional.</p>
          </div>
          <div className="map-filters-grid">
            <label className="map-filter-label">
              <span className="map-filter-label__text">Status</span>
              <select className="select" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value="">Todos</option>
                {statusOrder.map((status) => (
                  <option key={status} value={status}>
                    {labels.status(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="map-filter-label">
              <span className="map-filter-label__text">Qualidade</span>
              <select className="select" value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value as LocationQualityFilter)}>
                <option value="ALL">Todos</option>
                <option value="REAL">Somente coordenada real</option>
                <option value="ADDRESS">Aproximada por endereco</option>
                <option value="CITY">Aproximada por cidade/UF</option>
              </select>
            </label>
            <label className="map-filter-label">
              <span className="map-filter-label__text">Criador</span>
              <select className="select" value={selectedCreator} onChange={(event) => setSelectedCreator(event.target.value)}>
                <option value="">Todos</option>
                    {creatorOptions.map((creator) => (
                      <option key={creator.value} value={creator.value}>
                        {creator.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="map-filter-label map-filter-label--search">
              <span className="map-filter-label__text">Busca</span>
              <input
                className="input"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Titulo, codigo, cidade, bairro..."
              />
            </label>
          </div>
        </div>

        {isLoading && <span className="muted" style={{ fontSize: 13 }}>Carregando registros do mapa...</span>}
        {loadError && <span className="error-text">{loadError}</span>}
        {!loadError && !isLoading && items.length > 0 && visibleMapOpportunities.length === 0 && (
          <span className="muted" style={{ fontSize: 13 }}>
            Nenhuma obra corresponde aos filtros atuais ou faltam dados de localização para posicionamento.
          </span>
        )}

        <div className="map-wrapper" style={{ height: 430 }}>
          {!loadError && visibleMapOpportunities.length > 0 && (
            <div className="map-legend" aria-label="Legenda do mapa">
              <span className="map-legend__item">
                <span className="map-legend__dot map-legend__dot--exact" />
                Coordenada real
              </span>
              <span className="map-legend__item">
                <span className="map-legend__dot map-legend__dot--approximate" />
                Aproximada por endereço ou cidade
              </span>
            </div>
          )}
          <OpenStreetMapFallbackPanel
            center={center}
            mapOpportunities={visibleMapOpportunities}
            cityHeatPoints={cityHeatPoints}
            focusTarget={focusTarget}
            fitRequestId={fitRequestId}
            onResetViewport={handleResetViewport}
            mapStyle={mapStyle}
            onMapStyleChange={setMapStyle}
            clusterEnabled={clusterEnabled}
            onClusterEnabledChange={setClusterEnabled}
          />
        </div>
      </section>

      <section className="metric-grid map-kpis grid-auto-190">
        <article className="card metric-card">
          <div className="metric-label">Total de obras</div>
          <div className="metric-value" style={{ fontSize: 28 }}>{filteredItems.length}</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Posicionadas no mapa</div>
          <div className="metric-value" style={{ fontSize: 28 }}>{visibleMapOpportunities.length}</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Aproximadas (cidade/UF)</div>
          <div className="metric-value" style={{ fontSize: 28 }}>{approximateCount}</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Com coordenadas reais</div>
          <div className="metric-value" style={{ fontSize: 28 }}>{exactCount}</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Sem coordenada real</div>
          <div className="metric-value" style={{ fontSize: 28 }}>{Math.max(0, filteredItems.length - exactCount)}</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Cidades mapeadas</div>
          <div className="metric-value" style={{ fontSize: 28 }}>{cityAggregates.length}</div>
        </article>
      </section>

      <section className="grid-auto-240">
        <article className="card section-card--compact surface-card map-insight-card">
          <h3 className="section-title mb-10">Obras recentes no mapa</h3>
          <div className="stack-sm map-recent-list">
            {recentMapOpportunities.length === 0 ? (
              <span className="muted">Nenhuma obra posicionada para listar.</span>
            ) : (
              recentMapOpportunities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="btn btn-ghost map-recent-item"
                  onClick={() =>
                    setFocusTarget({
                      id: item.id,
                      lat: item.plotLat,
                      lng: item.plotLng,
                      zoom: item.isApproximate
                        ? (item.approximateLevel === "ADDRESS" ? 15 : 11)
                        : 17,
                    })
                  }
                  data-selected={focusTarget?.id === item.id ? "true" : "false"}
                >
                  <div className="map-recent-item__title">{item.title}</div>
                  <div className="map-recent-item__meta">{item.city ?? "-"}/{item.state ?? "-"} • {formatDate(item.capturedAt)}</div>
                  <div className="map-recent-item__meta">Capturada por: {formatUserDisplay(item.createdByUserId)}</div>
                  <div className="map-recent-item__quality" style={{ color: item.isApproximate ? approximateColor : "var(--color-primary-strong)" }}>
                    {item.isApproximate
                      ? (item.approximateLevel === "ADDRESS" ? "Aproximada por endereço" : "Aproximada por cidade/UF")
                      : "Coordenada real"}
                  </div>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="card section-card--compact surface-card map-insight-card">
          <h3 className="section-title mb-10">Top cidades</h3>
          <div className="stack-sm map-stat-list">
            {cityAggregates.length === 0 ? (
              <span className="muted">Nenhuma obra com dados suficientes de localização.</span>
            ) : (
              cityAggregates.map((row) => (
                <div
                  key={`${row.city}-${row.state}`}
                  className="map-stat-row"
                >
                  <span className="map-stat-row__label">{row.city}/{row.state}</span>
                  <div className="map-stat-row__bar-track">
                    <div className="map-stat-row__bar-fill" style={{ width: `${Math.max(10, (row.count / cityAggregateMax) * 100)}%` }} />
                  </div>
                  <strong className="map-stat-row__value">{row.count}</strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card section-card--compact surface-card map-insight-card">
          <h3 className="section-title mb-10">Quantidade por status</h3>
          <div className="stack-sm map-stat-list">
            {statusOrder.map((status) => (
              <div
                key={status}
                className="map-status-row"
              >
                <span className="map-status-row__dot" style={{ background: statusPalette[status] }} />
                <span className="map-status-row__label">{labels.status(status)}</span>
                <div className="map-status-row__bar-track">
                  <div className="map-status-row__bar-fill" style={{ width: `${Math.max(10, ((statusTotals[status] ?? 0) / statusAggregateMax) * 100)}%` }} />
                </div>
                <strong className="map-status-row__value">{statusTotals[status] ?? 0}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function OpenStreetMapFocusController({ target }: { target: FocusTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom, {
      animate: true,
      duration: 0.8,
    });
  }, [map, target]);

  return null;
}

function OpenStreetMapAutoFitBounds({
  points,
  fallbackCenter,
  target,
  fitRequestId,
}: {
  points: MappedOpportunity[];
  fallbackCenter: [number, number];
  target: FocusTarget | null;
  fitRequestId: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (target) return;
    if (points.length === 0) {
      map.setView(fallbackCenter, 4);
      return;
    }

    const bounds = new LatLngBounds(points.map((item) => [item.plotLat, item.plotLng] as [number, number]));
    map.fitBounds(bounds, {
      padding: [24, 24],
      maxZoom: 13,
      animate: true,
      duration: 0.8,
    });
  }, [map, points, fallbackCenter, target, fitRequestId]);

  return null;
}

function OpenStreetMapFallbackPanel({
  center,
  mapOpportunities,
  cityHeatPoints,
  focusTarget,
  fitRequestId,
  onResetViewport,
  mapStyle,
  onMapStyleChange,
  clusterEnabled,
  onClusterEnabledChange,
}: {
  center: [number, number];
  mapOpportunities: MappedOpportunity[];
  cityHeatPoints: Array<{ latitude: number; longitude: number; count: number }>;
  focusTarget: FocusTarget | null;
  fitRequestId: number;
  onResetViewport: () => void;
  mapStyle: MapStyleMode;
  onMapStyleChange: (next: MapStyleMode) => void;
  clusterEnabled: boolean;
  onClusterEnabledChange: (enabled: boolean) => void;
}) {
  const markerElements = mapOpportunities.map((item) => {
    const statusColor = statusPalette[item.status] ?? "var(--color-primary-strong)";
    const color = item.isApproximate ? approximateColor : statusColor;
    return (
      <Marker key={item.id} position={[item.plotLat, item.plotLng]} icon={leafletMarkerIcon(color)}>
        <Popup>
          <div style={{ display: "grid", gap: 6, minWidth: 170 }}>
            <strong>{item.title}</strong>
            <span style={{ fontSize: 12 }}>{item.city ?? "-"}/{item.state ?? "-"}</span>
            <span style={{ fontSize: 12 }}>Status: {labels.status(item.status)}</span>
            <span style={{ fontSize: 12 }}>
              Posicao: {item.isApproximate
                ? (item.approximateLevel === "ADDRESS" ? "Aproximada por endereco" : "Aproximada por cidade/UF")
                : "Coordenada real"}
            </span>
            <Link to={`/opportunities/${item.id}`} style={{ color: "var(--color-primary-strong)", fontWeight: 600 }}>
              Ver obra
            </Link>
          </div>
        </Popup>
      </Marker>
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%", minHeight: 0 }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <MapContainer
          center={center}
          zoom={mapOpportunities.length > 0 ? 8 : 4}
          style={{ height: "100%", width: "100%" }}
        >
          <OpenStreetMapAutoFitBounds
            points={mapOpportunities}
            fallbackCenter={defaultCenter}
            target={focusTarget}
            fitRequestId={fitRequestId}
          />
          <OpenStreetMapFocusController target={focusTarget} />
          {mapStyle === "SATELLITE" ? (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, USGS, AeroGRID, IGN'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          ) : mapStyle === "GOOGLE" ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {cityHeatPoints.map((point, index) => {
          const radius = Math.min(22000, 5000 + point.count * 2000);
          const opacity = Math.min(0.26, 0.07 + point.count * 0.035);
          return (
            <Circle
              key={`${point.latitude}-${point.longitude}-${index}`}
              center={[point.latitude, point.longitude]}
              radius={radius}
              pathOptions={{ color: heatStrokeColor, weight: 1, fillColor: heatFillColor, fillOpacity: opacity }}
            />
          );
        })}

          {clusterEnabled ? (
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={48}
              showCoverageOnHover={false}
              spiderfyOnMaxZoom
              iconCreateFunction={leafletClusterIcon}
            >
              {markerElements}
            </MarkerClusterGroup>
          ) : (
            markerElements
          )}
      </MapContainer>
        <div className="map-controls" aria-label="Controles do mapa">
          <button
            type="button"
            className={`map-control-btn ${clusterEnabled ? "is-active" : ""}`}
            onClick={() => onClusterEnabledChange(!clusterEnabled)}
          >
            Cluster {clusterEnabled ? "ON" : "OFF"}
          </button>
          <button type="button" className={`map-control-btn ${mapStyle === "GOOGLE" ? "is-active" : ""}`} onClick={() => onMapStyleChange("GOOGLE")}>Google-like</button>
          <button type="button" className={`map-control-btn ${mapStyle === "STREET" ? "is-active" : ""}`} onClick={() => onMapStyleChange("STREET")}>Ruas</button>
          <button type="button" className={`map-control-btn ${mapStyle === "SATELLITE" ? "is-active" : ""}`} onClick={() => onMapStyleChange("SATELLITE")}>Satelite</button>
          <button type="button" className="map-control-btn" onClick={onResetViewport}>
            Reenquadrar
          </button>
        </div>
      </div>
    </div>
  );
}
