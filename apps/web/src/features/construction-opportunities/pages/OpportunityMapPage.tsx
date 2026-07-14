import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Fragment } from "react/jsx-runtime";
import "leaflet/dist/leaflet.css";
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { DivIcon } from "leaflet";
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
  new DivIcon({
    className: "opportunity-map-marker",
    html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.2)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

export function OpportunityMapPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [cityCenters, setCityCenters] = useState<Record<string, CityCenter>>({});
  const [addressCenters, setAddressCenters] = useState<Record<string, AddressCenter>>({});

  useEffect(() => {
    const loadAll = async () => {
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

  const filteredItems = useMemo(() => {
    return items.filter((item) => (selectedStatus ? item.status === selectedStatus : true));
  }, [items, selectedStatus]);

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

  const listedMapOpportunities = useMemo(() => {
    return [...mapOpportunities].sort((a, b) => {
      const cityCompare = (a.city ?? "").localeCompare(b.city ?? "");
      if (cityCompare !== 0) return cityCompare;
      return a.title.localeCompare(b.title);
    });
  }, [mapOpportunities]);

  const center = useMemo<[number, number]>(() => {
    if (mapOpportunities.length === 0) {
      return defaultCenter;
    }
    const lat = mapOpportunities.reduce((sum, value) => sum + value.plotLat, 0) / mapOpportunities.length;
    const lng = mapOpportunities.reduce((sum, value) => sum + value.plotLng, 0) / mapOpportunities.length;
    return [lat, lng];
  }, [mapOpportunities]);

  const cityAggregates = useMemo<CityAggregate[]>(() => {
    const map = new Map<string, CityAggregate>();
    for (const item of mapOpportunities) {
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
  }, [mapOpportunities]);

  const statusTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const key of statusOrder) totals[key] = 0;
    for (const item of items) {
      totals[item.status] = (totals[item.status] ?? 0) + 1;
    }
    return totals;
  }, [items]);

  const cityHeatPoints = useMemo(() => {
    const grouped = new Map<string, { latitude: number; longitude: number; count: number }>();
    for (const item of mapOpportunities) {
      const key = cityKey(item);
      const current = grouped.get(key);
      if (current) {
        current.count += 1;
        continue;
      }
      grouped.set(key, { latitude: item.plotLat, longitude: item.plotLng, count: 1 });
    }
    return Array.from(grouped.values());
  }, [mapOpportunities]);

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
          <label className="map-filter-label" style={{ minWidth: 210 }}>
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
        </div>

        {loadError && <span className="error-text">{loadError}</span>}
        {!loadError && items.length > 0 && mapOpportunities.length === 0 && (
          <span className="muted" style={{ fontSize: 13 }}>
            Existem obras cadastradas, mas faltam cidade/UF ou coordenadas para posicionar no mapa.
          </span>
        )}

        <div className="map-wrapper" style={{ height: 430 }}>
          {!loadError && mapOpportunities.length > 0 && (
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
            mapOpportunities={mapOpportunities}
            cityHeatPoints={cityHeatPoints}
            focusTarget={focusTarget}
          />
        </div>
      </section>

      <section className="metric-grid map-kpis grid-auto-190">
        <article className="card metric-card">
          <div className="metric-label">Total de obras</div>
          <div className="metric-value" style={{ fontSize: 28 }}>{items.length}</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Posicionadas no mapa</div>
          <div className="metric-value" style={{ fontSize: 28 }}>{mapOpportunities.length}</div>
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
          <div className="metric-label">Cidades mapeadas</div>
          <div className="metric-value" style={{ fontSize: 28 }}>{cityAggregates.length}</div>
        </article>
      </section>

      <section className="grid-auto-240">
        <article className="card section-card--compact surface-card">
          <h3 className="section-title mb-10">Obras no mapa</h3>
          <div className="stack-sm" style={{ maxHeight: 320, overflow: "auto" }}>
            {listedMapOpportunities.length === 0 ? (
              <span className="muted">Nenhuma obra posicionada para listar.</span>
            ) : (
              listedMapOpportunities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="btn btn-ghost"
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
                  style={{
                    textAlign: "left",
                    minHeight: 0,
                    padding: "8px 10px",
                    borderColor: focusTarget?.id === item.id ? "var(--color-primary-strong)" : "var(--border)",
                    background: focusTarget?.id === item.id ? "var(--color-primary-soft)" : "transparent",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)" }}>{item.city ?? "-"}/{item.state ?? "-"}</div>
                  <div style={{ fontSize: 12, color: item.isApproximate ? approximateColor : "var(--color-primary-strong)" }}>
                    {item.isApproximate
                      ? (item.approximateLevel === "ADDRESS" ? "Aproximada por endereço" : "Aproximada por cidade/UF")
                      : "Coordenada real"}
                  </div>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="card section-card--compact surface-card">
          <h3 className="section-title mb-10">Top cidades</h3>
          <div className="stack-sm">
            {cityAggregates.length === 0 ? (
              <span className="muted">Nenhuma obra com dados suficientes de localização.</span>
            ) : (
              cityAggregates.map((row) => (
                <div
                  key={`${row.city}-${row.state}`}
                  style={{ display: "flex", justifyContent: "space-between", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}
                >
                  <span>{row.city}/{row.state}</span>
                  <strong>{row.count}</strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card section-card--compact surface-card">
          <h3 className="section-title mb-10">Quantidade por status</h3>
          <div className="stack-sm">
            {statusOrder.map((status) => (
              <div
                key={status}
                style={{
                  display: "grid",
                  gridTemplateColumns: "14px 1fr auto",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 999, background: statusPalette[status] }} />
                <span>{labels.status(status)}</span>
                <strong>{statusTotals[status] ?? 0}</strong>
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

function OpenStreetMapFallbackPanel({
  center,
  mapOpportunities,
  cityHeatPoints,
  focusTarget,
}: {
  center: [number, number];
  mapOpportunities: MappedOpportunity[];
  cityHeatPoints: Array<{ latitude: number; longitude: number; count: number }>;
  focusTarget: FocusTarget | null;
}) {
  const [satellite, setSatellite] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%", minHeight: 0 }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <MapContainer
          center={center}
          zoom={mapOpportunities.length > 0 ? 8 : 4}
          style={{ height: "100%", width: "100%" }}
        >
          <OpenStreetMapFocusController target={focusTarget} />
          {satellite ? (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, USGS, AeroGRID, IGN'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
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

        {mapOpportunities.map((item) => {
          const statusColor = statusPalette[item.status] ?? "var(--color-primary-strong)";
          const color = item.isApproximate ? approximateColor : statusColor;
          return (
            <Fragment key={item.id}>
              <CircleMarker
                center={[item.plotLat, item.plotLng]}
                radius={9}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.16, weight: 2 }}
              />
              <Marker position={[item.plotLat, item.plotLng]} icon={leafletMarkerIcon(color)}>
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
            </Fragment>
          );
        })}
      </MapContainer>
        <button
          onClick={() => setSatellite((s) => !s)}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1000,
            padding: "6px 12px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 6,
            border: "1px solid rgba(0,0,0,0.2)",
            background: satellite ? "#1a1a2e" : "#fff",
            color: satellite ? "#fff" : "#333",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}
        >
          {satellite ? "🗺 Mapa" : "🛰 Satélite"}
        </button>
      </div>
    </div>
  );
}
