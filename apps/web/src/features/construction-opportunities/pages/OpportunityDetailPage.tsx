import { Copy, FileText, MapPinned, MessageCircle, Pencil, Trash2, Briefcase, Hammer, CheckCircle, Clock, User, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { APP_CONFIG } from "../../../config/app";
import { addressLabel, formatDate } from "../../../utils/format";
import { labels } from "../../../utils/labels";
import { buildOpportunityPdf } from "../services/opportunity-pdf";
import { opportunitiesApi } from "../services/opportunities-api";
import type { Opportunity } from "../types/opportunity.types";

export function OpportunityDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Opportunity | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const isSecureContextForShare =
    typeof window !== "undefined" &&
    (window.isSecureContext || window.location.hostname === "localhost");

  useEffect(() => {
    void opportunitiesApi.getById(id).then((data) => {
      setItem(data);
      const initialPhoto = data.photos.find((photo) => photo.isPrimary) ?? data.photos[0] ?? null;
      setSelectedPhotoId(initialPhoto?.id ?? null);
    });
  }, [id]);

  if (!item) return <div className="page">Carregando obra...</div>;

  const mainPhoto =
    item.photos.find((photo) => photo.id === selectedPhotoId) ??
    item.photos.find((photo) => photo.isPrimary) ??
    item.photos[0];
  const mapLink = item.latitude && item.longitude
    ? `https://www.google.com/maps?q=${item.latitude},${item.longitude}`
    : "#";

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // noop
    }
  };

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openPdfInNewTab = (file: File) => {
    const url = URL.createObjectURL(file);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      downloadFile(file);
      URL.revokeObjectURL(url);
      return;
    }

    // Keep the blob URL alive briefly for the new tab to load the file.
    window.setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const handleGeneratePdf = async () => {
    setExportingPdf(true);
    try {
      const file = await buildOpportunityPdf(item);
      openPdfInNewTab(file);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSharePdfWhatsApp = async () => {
    setSharingPdf(true);
    setShareFeedback(null);
    try {
      const file = await buildOpportunityPdf(item);

      if (!isSecureContextForShare) {
        downloadFile(file);
        const message = encodeURIComponent(
          `PDF da solicitacao da obra ${item.title} (${item.code}) gerado. Vou anexar o arquivo nesta conversa.`,
        );
        window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
        setShareFeedback(
          "Anexo automatico indisponivel neste acesso por rede local (HTTP). PDF baixado; anexe no WhatsApp pelo clipe > Documento.",
        );
        return;
      }

      const canUseNativeShare =
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        "canShare" in navigator &&
        (navigator as any).canShare({ files: [file] });

      if (canUseNativeShare) {
        try {
          await (navigator as any).share({
            files: [file],
            title: `Solicitacao de prospeccao - ${item.code}`,
            text: `Segue anexo em PDF da obra ${item.title} (${item.code}).`,
          });
          setShareFeedback("PDF compartilhado com anexo.");
          return;
        } catch {
          // Continue with fallback when sharing is cancelled or unavailable at runtime.
        }
      }

      // Fallback for browsers without native file sharing.
      downloadFile(file);
      const message = encodeURIComponent(
        `PDF da solicitacao da obra ${item.title} (${item.code}) gerado. Vou anexar o arquivo nesta conversa.`,
      );
      window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
      setShareFeedback(
        "Seu navegador nao permitiu anexo automatico. O PDF foi baixado: anexe no WhatsApp pelo clipe > Documento.",
      );
    } finally {
      setSharingPdf(false);
    }
  };

  return (
    <div className="page grid">
      <section className="card section-card surface-card">
        <div className="justify-between-wrap">
          <div>
            <h2 className="page-title mb-8">{item.title}</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              {item.code} - {formatDate(item.capturedAt)}
            </div>
            <div className="cluster mt-10">
              <span className="badge">{labels.status(item.status)}</span>
              <span className="badge">{labels.commercialPotential(item.commercialPotential)}</span>
              {item.isTest && <span className="badge" style={{ backgroundColor: "#fed7aa", color: "#92400e" }}>⚠️ Teste</span>}
            </div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-secondary detail-action-primary" onClick={handleGeneratePdf} disabled={exportingPdf}>
              <FileText size={16} /> {exportingPdf ? "Gerando PDF..." : "Abrir PDF"}
            </button>
            <button className="btn btn-secondary detail-action-primary" onClick={handleSharePdfWhatsApp} disabled={sharingPdf}>
              <MessageCircle size={16} /> {sharingPdf ? "Preparando..." : "WhatsApp (PDF)"}
            </button>
            <button className="btn btn-ghost detail-action-secondary" onClick={() => navigate(`/opportunities/${id}/edit`)}>
              <Pencil size={16} /> Editar
            </button>
            <button
              className="btn btn-ghost detail-action-secondary"
              onClick={() => {
                const confirmDelete = window.confirm("Excluir este registro?");
                if (confirmDelete) {
                  void opportunitiesApi.remove(id).then(() => navigate("/opportunities"));
                }
              }}
            >
              <Trash2 size={16} /> Excluir
            </button>
          </div>
        </div>
        {shareFeedback && (
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 13 }}>
            {shareFeedback}
          </p>
        )}
        {!isSecureContextForShare && (
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
            Dica: anexo automático funciona melhor em HTTPS/PWA. Em rede local HTTP, use o fluxo de baixar e anexar.
          </p>
        )}
      </section>

      <section className="card section-card surface-card">
        <h3 className="section-title">Imagens</h3>
        <div className="photo-gallery">
          <div className="photo-preview-frame photo-preview-main" aria-label="Pré-visualização da foto selecionada">
            {mainPhoto ? (
              <img
                src={`${APP_CONFIG.uploadsBaseUrl}/${mainPhoto.relativePath}`}
                alt={mainPhoto.originalName}
                className="photo-preview-image"
              />
            ) : (
              <div className="photo-preview-empty">Nenhuma imagem cadastrada</div>
            )}
          </div>

          <aside className="photo-gallery-sidebar">
            <div className="photo-gallery-hint">
              <strong>Galeria</strong>
              <span>{item.photos.length} foto{item.photos.length === 1 ? "" : "s"}</span>
            </div>

            <div className="photo-thumbnail-list">
              {item.photos.map((photo) => (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => setSelectedPhotoId(photo.id)}
                  className={photo.id === selectedPhotoId ? "photo-thumbnail is-selected" : "photo-thumbnail"}
                  title="Exibir foto"
                >
                  <img
                    src={`${APP_CONFIG.uploadsBaseUrl}/${photo.relativePath}`}
                    alt={photo.originalName}
                    className="photo-thumbnail-image"
                  />
                </button>
              ))}
            </div>

            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Clique nas miniaturas para trocar a imagem grande acima.
            </p>
          </aside>
        </div>
      </section>

      <section className="card section-card surface-card">
        <h3 className="section-title">Localização</h3>
        <div>{addressLabel(item)}</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {item.city} - {item.state} | Origem: {labels.addressSource(item.addressSource)}
        </div>
        <div className="cluster mt-8">
          <button className="btn btn-ghost" onClick={() => copyText(addressLabel(item))}><Copy size={16} /> Copiar endereco</button>
          {!!item.latitude && !!item.longitude && (
            <>
              <button className="btn btn-ghost" onClick={() => copyText(`${item.latitude},${item.longitude}`)}><MapPinned size={16} /> Copiar coordenadas</button>
              <a className="btn btn-secondary" href={mapLink} target="_blank" rel="noreferrer">Abrir no mapa</a>
            </>
          )}
        </div>
      </section>

      <section className="card section-card surface-card">
        <h3 className="section-title">Informações da obra</h3>
        <div className="info-cards-grid">
          <div className="info-card">
            <div className="info-card-icon">
              <Briefcase />
              <span className="info-card-label">Tipo</span>
            </div>
            <div className="info-card-value">{labels.constructionType(item.constructionType)}</div>
          </div>
          <div className="info-card">
            <div className="info-card-icon">
              <Hammer />
              <span className="info-card-label">Estágio</span>
            </div>
            <div className="info-card-value">{labels.constructionStage(item.constructionStage)}</div>
          </div>
          <div className="info-card">
            <div className="info-card-icon">
              <CheckCircle />
              <span className="info-card-label">Próxima ação</span>
            </div>
            <div className="info-card-value">{item.nextAction ?? "-"}</div>
          </div>
          <div className="info-card">
            <div className="info-card-icon">
              <Clock />
              <span className="info-card-label">Data da ação</span>
            </div>
            <div className="info-card-value">{formatDate(item.nextActionDate)}</div>
          </div>
          <div className="info-card">
            <div className="info-card-icon">
              <User />
              <span className="info-card-label">Contato</span>
            </div>
            <div className="info-card-value">{item.contactName ?? "-"}</div>
          </div>
          <div className="info-card">
            <div className="info-card-icon">
              <Zap />
              <span className="info-card-label">CRM</span>
            </div>
            <span className="info-card-badge">{labels.crmStatus(item.crmIntegrationStatus)}</span>
          </div>
        </div>
        <p className="mt-14">{item.notes ?? "Sem observações."}</p>
      </section>
    </div>
  );
}
