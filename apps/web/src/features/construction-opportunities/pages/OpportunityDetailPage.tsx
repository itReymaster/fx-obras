import { Copy, FileText, MapPinned, MessageCircle, Pencil, Trash2, Briefcase, Hammer, CheckCircle, Clock, User, Zap, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { APP_CONFIG } from "../../../config/app";
import { addressLabel, formatDate, formatUserDisplay } from "../../../utils/format";
import { labels, statusOptions } from "../../../utils/labels";
import { buildOpportunityPdf } from "../services/opportunity-pdf";
import { opportunitiesApi } from "../services/opportunities-api";
import type { Opportunity, OpportunityAudio } from "../types/opportunity.types";

export function OpportunityDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Opportunity | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<string>("CAPTURED");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [isPhotoZoomOpen, setIsPhotoZoomOpen] = useState(false);
  const [audios, setAudios] = useState<OpportunityAudio[]>([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const isSecureContextForShare =
    typeof window !== "undefined" &&
    (window.isSecureContext || window.location.hostname === "localhost");
  const isSecureContextForMic =
    typeof window !== "undefined" &&
    (window.isSecureContext || window.location.hostname === "localhost");

  useEffect(() => {
    void opportunitiesApi.getById(id).then((data) => {
      setItem(data);
      setStatusDraft(data.status);
      const initialPhoto = data.photos.find((photo) => photo.isPrimary) ?? data.photos[0] ?? null;
      setSelectedPhotoId(initialPhoto?.id ?? null);
    });

    void opportunitiesApi.listAudios(id)
      .then((data) => setAudios(data))
      .catch(() => setAudioFeedback("Nao foi possivel carregar os audios anexados."));
  }, [id]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!isPhotoZoomOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPhotoZoomOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPhotoZoomOpen]);

  if (!item) return <div className="page">Carregando obra...</div>;

  const mainPhoto =
    item.photos.find((photo) => photo.id === selectedPhotoId) ??
    item.photos.find((photo) => photo.isPrimary) ??
    item.photos[0];
  const mapLink = item.latitude && item.longitude
    ? `https://www.google.com/maps?q=${item.latitude},${item.longitude}`
    : "#";
  const detailRecord = item as Opportunity & {
    description?: string | null;
    contactCompany?: string | null;
    contactRole?: string | null;
    constructionCompany?: string | null;
    estimatedCompletionDate?: string | null;
  };
  const capturedByUser = formatUserDisplay(item.createdByUserId);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // noop
    }
  };

  const formatAudioSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatRecordingTime = (seconds: number): string => {
    const safeSeconds = Math.max(0, Math.min(60, seconds));
    const minutesPart = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
    const secondsPart = String(safeSeconds % 60).padStart(2, "0");
    return `${minutesPart}:${secondsPart}`;
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const uploadRecordedAudio = async (blob: Blob, mimeType: string) => {
    const extension =
      mimeType.includes("mpeg") ? "mp3" :
      mimeType.includes("wav") ? "wav" :
      mimeType.includes("ogg") ? "ogg" :
      mimeType.includes("mp4") ? "mp4" :
      "webm";

    const file = new File([blob], `audio-${Date.now()}.${extension}`, { type: mimeType || "audio/webm" });
    setIsUploadingAudio(true);
    setAudioFeedback(null);
    try {
      await opportunitiesApi.uploadAudio(id, file);
      const data = await opportunitiesApi.listAudios(id);
      setAudios(data);
      setAudioFeedback("Audio anexado com sucesso.");
    } catch {
      setAudioFeedback("Nao foi possivel anexar o audio.");
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleStartAudioRecording = async () => {
    if (!isSecureContextForMic) {
      setAudioFeedback("Gravacao de audio requer HTTPS ou localhost.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setAudioFeedback("Seu navegador nao suporta gravacao de audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
      ];
      const selectedType = preferredTypes.find((value) => MediaRecorder.isTypeSupported(value));
      const recorder = selectedType ? new MediaRecorder(stream, { mimeType: selectedType }) : new MediaRecorder(stream);

      mediaChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        mediaChunksRef.current = [];
        stopRecordingTimer();
        setRecordingSeconds(0);
        setIsRecordingAudio(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        if (blob.size > 0) {
          await uploadRecordedAudio(blob, recorder.mimeType || "audio/webm");
        }
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      setAudioFeedback("Gravando audio...");

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((previous) => {
          const next = previous + 1;
          if (next >= 60 && mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
          return Math.min(next, 60);
        });
      }, 1000);
    } catch {
      setAudioFeedback("Nao foi possivel acessar o microfone.");
      setIsRecordingAudio(false);
      stopRecordingTimer();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleStopAudioRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleDeleteAudio = async (audioId: string) => {
    const confirmed = window.confirm("Remover este audio da oportunidade?");
    if (!confirmed) return;

    try {
      await opportunitiesApi.deleteAudio(id, audioId);
      const data = await opportunitiesApi.listAudios(id);
      setAudios(data);
      setAudioFeedback("Audio removido com sucesso.");
    } catch {
      setAudioFeedback("Nao foi possivel remover o audio.");
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

  const handleStatusUpdate = async () => {
    if (!item || statusDraft === item.status) return;

    setUpdatingStatus(true);
    setStatusFeedback(null);
    try {
      await opportunitiesApi.updateStatus(item.id, statusDraft);
      setItem({ ...item, status: statusDraft as Opportunity["status"] });
      setStatusFeedback("Status atualizado com sucesso.");
    } catch (error: any) {
      setStatusFeedback(error?.response?.data?.message ?? "Nao foi possivel atualizar o status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="page grid">
      <section className="card section-card surface-card">
        <div className="justify-between-wrap">
          <div>
            <h2 className="page-title mb-8">{item.title}</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              {item.code} - {formatDate(item.capturedAt)} - Capturado por: {capturedByUser}
            </div>
            <div className="cluster mt-10">
              <span className="badge">{labels.status(item.status)}</span>
              <span className="badge">{labels.commercialPotential(item.commercialPotential)}</span>
              {item.isTest && <span className="badge-test">✨ Teste</span>}
            </div>
          </div>
          <div className="detail-actions">
            <div className="detail-status-editor">
              <label className="detail-status-label" htmlFor="detail-status-select">Status do funil</label>
              <div className="detail-status-controls">
                <select
                  id="detail-status-select"
                  className="select"
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value)}
                  disabled={updatingStatus}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary detail-status-button"
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus || statusDraft === item.status}
                >
                  {updatingStatus ? "Atualizando..." : "Atualizar status"}
                </button>
              </div>
            </div>
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
        {statusFeedback && (
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
            {statusFeedback}
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
              <button
                type="button"
                className="photo-preview-zoom-trigger"
                onClick={() => setIsPhotoZoomOpen(true)}
                title="Clique para ampliar"
                aria-label="Ampliar foto da obra"
              >
                <img
                  src={`${APP_CONFIG.uploadsBaseUrl}/${mainPhoto.relativePath}`}
                  alt={mainPhoto.originalName}
                  className="photo-preview-image"
                />
              </button>
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
              Clique nas miniaturas para trocar a imagem e clique na imagem grande para ampliar.
            </p>
          </aside>
        </div>

        {mainPhoto && isPhotoZoomOpen && (
          <div
            className="photo-zoom-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Visualização ampliada da foto"
            onClick={() => setIsPhotoZoomOpen(false)}
          >
            <div className="photo-zoom-modal-content" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="photo-zoom-modal-close"
                onClick={() => setIsPhotoZoomOpen(false)}
                aria-label="Fechar visualização ampliada"
              >
                Fechar
              </button>
              <img
                src={`${APP_CONFIG.uploadsBaseUrl}/${mainPhoto.relativePath}`}
                alt={mainPhoto.originalName}
                className="photo-zoom-modal-image"
              />
            </div>
          </div>
        )}
      </section>

      <section className="card section-card surface-card">
        <div className="justify-between-wrap audio-record-header" style={{ alignItems: "center", gap: 12 }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Audio da oportunidade</h3>
          <button
            type="button"
            className={`btn audio-record-button audio-record-button--compact${isRecordingAudio ? " is-recording" : ""}`}
            onClick={isRecordingAudio ? handleStopAudioRecording : handleStartAudioRecording}
            disabled={isUploadingAudio}
            title={isRecordingAudio ? "Parar gravacao" : "Gravar audio"}
          >
            {isRecordingAudio ? <Square size={16} /> : <Mic size={16} />}
            {isRecordingAudio ? `Parar (${formatRecordingTime(recordingSeconds)} / 01:00)` : "Gravar audio (ate 60s)"}
          </button>
        </div>

        {audioFeedback && (
          <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }}>
            {audioFeedback}
          </p>
        )}

        {!isSecureContextForMic && (
          <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
            A gravacao de audio exige HTTPS ou localhost.
          </p>
        )}

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {audios.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Nenhum audio anexado.</p>
          ) : (
            audios.map((audio) => (
              <div
                key={audio.id}
                className="card"
                style={{ padding: 12, display: "grid", gap: 8 }}
              >
                <div className="justify-between-wrap" style={{ alignItems: "center", gap: 8 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {formatDate(audio.createdAt)} - {formatAudioSize(audio.size)}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDeleteAudio(audio.id)}
                  >
                    <Trash2 size={14} /> Remover
                  </button>
                </div>
                <audio
                  className="opportunity-audio-player"
                  controls
                  preload="metadata"
                  src={`${APP_CONFIG.uploadsBaseUrl}/${audio.relativePath}`}
                />
              </div>
            ))
          )}
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
        <h3 className="section-title">Dados da obra</h3>
        <div className="detail-block-grid">
          <div className="detail-field">
            <span className="detail-field-label">Código</span>
            <span className="detail-field-value">{item.code}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Título</span>
            <span className="detail-field-value">{item.title}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Empresa da obra</span>
            <span className="detail-field-value">{detailRecord.constructionCompany ?? "-"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Capturado por</span>
            <span className="detail-field-value">{capturedByUser}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Próxima ação</span>
            <span className="detail-field-value">{item.nextAction ?? "-"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Data da próxima ação</span>
            <span className="detail-field-value">{formatDate(item.nextActionDate)}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Previsão de conclusão</span>
            <span className="detail-field-value">{formatDate(detailRecord.estimatedCompletionDate)}</span>
          </div>
          <div className="detail-field detail-field--full">
            <span className="detail-field-label">Descrição</span>
            <span className="detail-field-value">{detailRecord.description ?? "-"}</span>
          </div>
          <div className="detail-field detail-field--full">
            <span className="detail-field-label">Observações</span>
            <span className="detail-field-value">{item.notes ?? "Sem observações."}</span>
          </div>
        </div>
      </section>

      <section className="card section-card surface-card">
        <h3 className="section-title">Dados de contato</h3>
        <div className="detail-block-grid">
          <div className="detail-field">
            <span className="detail-field-label">Nome</span>
            <span className="detail-field-value">{item.contactName ?? "-"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Telefone</span>
            <span className="detail-field-value">{item.contactPhone ?? "-"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">E-mail</span>
            <span className="detail-field-value">{item.contactEmail ?? "-"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Empresa</span>
            <span className="detail-field-value">{detailRecord.contactCompany ?? "-"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Cargo</span>
            <span className="detail-field-value">{detailRecord.contactRole ?? "-"}</span>
          </div>
        </div>
      </section>

      <section className="card section-card surface-card">
        <h3 className="section-title">Qualificação da obra</h3>
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
              <span className="info-card-label">Status</span>
            </div>
            <div className="info-card-value">{labels.status(item.status)}</div>
          </div>
          <div className="info-card">
            <div className="info-card-icon">
              <Clock />
              <span className="info-card-label">Potencial</span>
            </div>
            <div className="info-card-value">{labels.commercialPotential(item.commercialPotential)}</div>
          </div>
          <div className="info-card">
            <div className="info-card-icon">
              <Zap />
              <span className="info-card-label">CRM</span>
            </div>
            <span className="info-card-badge">{labels.crmStatus(item.crmIntegrationStatus)}</span>
          </div>
          <div className="info-card">
            <div className="info-card-icon">
              <User />
              <span className="info-card-label">Tipo de registro</span>
            </div>
            <div className="info-card-value">{item.isTest ? "Teste" : "Real"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
