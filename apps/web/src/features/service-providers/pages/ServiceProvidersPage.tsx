import { useEffect, useMemo, useState } from "react";
import { opportunitiesApi } from "../../construction-opportunities/services/opportunities-api";
import type { Opportunity } from "../../construction-opportunities/types/opportunity.types";
import { serviceProvidersApi } from "../services/service-providers-api";
import type {
  OpportunityProviderLink,
  ProviderOpportunityLink,
  ServiceProvider,
} from "../types/service-provider.types";

const providerTypeOptions = [
  "EMPREITEIRO",
  "ELETRICISTA",
  "ENCANADOR",
  "PINTOR",
  "GESSEIRO",
  "MARCENEIRO",
  "SERRALHEIRO",
  "OUTROS",
];

export function ServiceProvidersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [binding, setBinding] = useState(false);
  const [search, setSearch] = useState("");
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [currentLinks, setCurrentLinks] = useState<OpportunityProviderLink[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedOpportunityIdsByProvider, setSelectedOpportunityIdsByProvider] = useState<string[]>([]);
  const [currentProviderLinks, setCurrentProviderLinks] = useState<ProviderOpportunityLink[]>([]);
  const [opportunitySearch, setOpportunitySearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "EMPREITEIRO",
    phone: "",
    email: "",
    city: "",
    notes: "",
  });

  const loadBase = async () => {
    setLoading(true);
    try {
      const [providersData, opportunitiesData] = await Promise.all([
        serviceProvidersApi.list(),
        opportunitiesApi.list({ page: 1, pageSize: 100, sortBy: "most_recent" }),
      ]);

      setProviders(providersData);
      setOpportunities(opportunitiesData.data);

      if (!selectedOpportunityId && opportunitiesData.data.length > 0) {
        setSelectedOpportunityId(opportunitiesData.data[0].id);
      }

      if (!selectedProviderId && providersData.length > 0) {
        setSelectedProviderId(providersData[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBase();
  }, []);

  useEffect(() => {
    if (!selectedOpportunityId) {
      setCurrentLinks([]);
      setSelectedProviderIds([]);
      return;
    }

    void serviceProvidersApi.listByOpportunity(selectedOpportunityId).then((links) => {
      setCurrentLinks(links);
      setSelectedProviderIds(links.map((item) => item.provider.id));
    });
  }, [selectedOpportunityId]);

  useEffect(() => {
    if (!selectedProviderId) {
      setCurrentProviderLinks([]);
      setSelectedOpportunityIdsByProvider([]);
      return;
    }

    void serviceProvidersApi.listOpportunitiesByProvider(selectedProviderId).then((links) => {
      setCurrentProviderLinks(links);
      setSelectedOpportunityIdsByProvider(links.map((item) => item.opportunity.id));
    });
  }, [selectedProviderId]);

  const filteredProviders = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return providers;
    return providers.filter((provider) =>
      `${provider.name} ${provider.type} ${provider.city ?? ""}`.toLowerCase().includes(normalized),
    );
  }, [providers, search]);

  const selectedOpportunity = opportunities.find((item) => item.id === selectedOpportunityId);
  const selectedProvider = providers.find((item) => item.id === selectedProviderId);

  const filteredOpportunities = useMemo(() => {
    const normalized = opportunitySearch.trim().toLowerCase();
    if (!normalized) return opportunities;
    return opportunities.filter((opportunity) =>
      `${opportunity.code} ${opportunity.title} ${opportunity.city ?? ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [opportunities, opportunitySearch]);

  const onToggleProvider = (providerId: string) => {
    setSelectedProviderIds((current) =>
      current.includes(providerId)
        ? current.filter((value) => value !== providerId)
        : [...current, providerId],
    );
  };

  const onSubmitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await serviceProvidersApi.create({
        name: form.name,
        type: form.type,
        phone: form.phone || undefined,
        email: form.email || undefined,
        city: form.city || undefined,
        notes: form.notes || undefined,
      });

      setForm({
        name: "",
        type: "EMPREITEIRO",
        phone: "",
        email: "",
        city: "",
        notes: "",
      });

      const providersData = await serviceProvidersApi.list();
      setProviders(providersData);

      if (!selectedProviderId && providersData.length > 0) {
        setSelectedProviderId(providersData[0].id);
      }

      setFeedback("Prestador cadastrado com sucesso.");
    } catch {
      setFeedback("Não foi possível cadastrar o prestador.");
    } finally {
      setSaving(false);
    }
  };

  const onSaveBindings = async () => {
    if (!selectedOpportunityId) return;
    setBinding(true);
    setFeedback(null);
    try {
      const links = await serviceProvidersApi.bindToOpportunity(selectedOpportunityId, selectedProviderIds);
      setCurrentLinks(links);
      setFeedback("Vínculos atualizados com sucesso.");
    } catch {
      setFeedback("Não foi possível atualizar os vínculos.");
    } finally {
      setBinding(false);
    }
  };

  const onToggleOpportunity = (opportunityId: string) => {
    setSelectedOpportunityIdsByProvider((current) =>
      current.includes(opportunityId)
        ? current.filter((value) => value !== opportunityId)
        : [...current, opportunityId],
    );
  };

  const onSaveProviderBindings = async () => {
    if (!selectedProviderId) return;
    setBinding(true);
    setFeedback(null);
    try {
      const links = await serviceProvidersApi.bindOpportunitiesToProvider(
        selectedProviderId,
        selectedOpportunityIdsByProvider,
      );
      setCurrentProviderLinks(links);
      setFeedback("Obras do prestador atualizadas com sucesso.");
    } catch {
      setFeedback("Não foi possível atualizar as obras do prestador.");
    } finally {
      setBinding(false);
    }
  };

  if (loading) {
    return <div className="page">Carregando prestadores...</div>;
  }

  return (
    <div className="page grid" style={{ gap: 14 }}>
      <section className="card section-card surface-card">
        <h2 className="page-title" style={{ marginBottom: 8 }}>Prestadores de Serviço</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Cadastro rápido inicial para empreiteiros, eletricistas e outros perfis.
        </p>
      </section>

      <section className="card section-card surface-card">
        <h3 className="section-title">Cadastro rápido</h3>
        <form className="grid" onSubmit={onSubmitCreate}>
          <div className="grid-2">
            <label>
              Nome
              <input
                className="input"
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              Tipo
              <select
                className="select"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              >
                {providerTypeOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid-2">
            <label>
              Telefone
              <input
                className="input"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
            <label>
              Cidade
              <input
                className="input"
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              />
            </label>
          </div>

          <label>
            E-mail
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>

          <label>
            Observações
            <textarea
              className="textarea"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar prestador"}
          </button>
        </form>
      </section>

      <section className="card section-card surface-card">
        <h3 className="section-title">Vincular prestadores à obra</h3>
        <div className="grid" style={{ gap: 10 }}>
          <label>
            Obra
            <select
              className="select"
              value={selectedOpportunityId}
              onChange={(event) => setSelectedOpportunityId(event.target.value)}
            >
              {opportunities.map((item) => (
                <option key={item.id} value={item.id}>{item.code} - {item.title}</option>
              ))}
            </select>
          </label>

          <label>
            Buscar prestador
            <input
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, tipo ou cidade"
            />
          </label>

          <div className="grid" style={{ gap: 8 }}>
            {filteredProviders.length === 0 ? (
              <span className="muted">Nenhum prestador encontrado.</span>
            ) : (
              filteredProviders.map((provider) => {
                const checked = selectedProviderIds.includes(provider.id);
                return (
                  <label key={provider.id} className="checkbox-label" style={{ alignItems: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleProvider(provider.id)}
                    />
                    <span>
                      <strong>{provider.name}</strong> - {provider.type}
                      {(provider.city || provider.phone) && (
                        <span className="muted" style={{ marginLeft: 6 }}>
                          {provider.city ? `• ${provider.city}` : ""} {provider.phone ? `• ${provider.phone}` : ""}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <button type="button" className="btn btn-primary" disabled={binding || !selectedOpportunityId} onClick={onSaveBindings}>
            {binding ? "Atualizando vínculos..." : "Salvar vínculos"}
          </button>

          <div className="summary-box-sm">
            <strong>Obra selecionada:</strong> {selectedOpportunity ? `${selectedOpportunity.code} - ${selectedOpportunity.title}` : "-"}
            <br />
            <strong>Prestadores vinculados:</strong> {currentLinks.length}
          </div>
        </div>
      </section>

      <section className="card section-card surface-card">
        <h3 className="section-title">Vincular obras ao prestador</h3>
        <div className="grid" style={{ gap: 10 }}>
          <label>
            Prestador
            <select
              className="select"
              value={selectedProviderId}
              onChange={(event) => setSelectedProviderId(event.target.value)}
            >
              {providers.map((item) => (
                <option key={item.id} value={item.id}>{item.name} - {item.type}</option>
              ))}
            </select>
          </label>

          <label>
            Buscar obra
            <input
              className="input"
              value={opportunitySearch}
              onChange={(event) => setOpportunitySearch(event.target.value)}
              placeholder="Código, título ou cidade"
            />
          </label>

          <div className="grid" style={{ gap: 8 }}>
            {filteredOpportunities.length === 0 ? (
              <span className="muted">Nenhuma obra encontrada.</span>
            ) : (
              filteredOpportunities.map((opportunity) => {
                const checked = selectedOpportunityIdsByProvider.includes(opportunity.id);
                return (
                  <label key={opportunity.id} className="checkbox-label" style={{ alignItems: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleOpportunity(opportunity.id)}
                    />
                    <span>
                      <strong>{opportunity.code}</strong> - {opportunity.title}
                      {opportunity.city && (
                        <span className="muted" style={{ marginLeft: 6 }}>
                          • {opportunity.city}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={binding || !selectedProviderId}
            onClick={onSaveProviderBindings}
          >
            {binding ? "Atualizando obras..." : "Salvar obras do prestador"}
          </button>

          <div className="summary-box-sm">
            <strong>Prestador selecionado:</strong> {selectedProvider ? `${selectedProvider.name} - ${selectedProvider.type}` : "-"}
            <br />
            <strong>Obras vinculadas:</strong> {currentProviderLinks.length}
          </div>
        </div>
      </section>

      <section className="card section-card surface-card">
        <h3 className="section-title">Base de prestadores</h3>
        {providers.length === 0 ? (
          <span className="muted">Nenhum prestador cadastrado ainda.</span>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Cidade</th>
                  <th>Telefone</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.id}>
                    <td>{provider.name}</td>
                    <td><span className="badge">{provider.type}</span></td>
                    <td>{provider.city || "-"}</td>
                    <td>{provider.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {feedback && <span className="success-text">{feedback}</span>}
    </div>
  );
}
