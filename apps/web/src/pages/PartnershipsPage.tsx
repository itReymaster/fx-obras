import { Bell, Handshake, Sparkles } from "lucide-react";
import { useState } from "react";

export function PartnershipsPage() {
  const [isNotifyRequested, setIsNotifyRequested] = useState(false);

  return (
    <div className="page grid partnerships-page">
      <div className="page-header">
        <h2>Parcerias</h2>
        <p>Canal dedicado para colaboração estratégica em obras.</p>
      </div>

      <section className="card section-card surface-card partnerships-placeholder-card">
        <div className="cluster partnerships-head">
          <span className="app-launcher-item-icon" aria-hidden="true">
            <Handshake size={18} />
          </span>
          <strong>Em breve</strong>
        </div>
        <p className="muted partnerships-description">
          Em breve teremos como estabelecer parcerias para obras com fluxo dedicado,
          acompanhamento e visibilidade comercial.
        </p>
        <div className="hero-note partnerships-note">
          <Sparkles size={14} /> Novidades desta funcionalidade serao publicadas aqui.
        </div>

        <div className="partnerships-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsNotifyRequested(true)}
            disabled={isNotifyRequested}
          >
            <Bell size={16} /> {isNotifyRequested ? "Aviso registrado" : "Quero ser avisado"}
          </button>

          {isNotifyRequested && (
            <p className="partnerships-feedback">Recebido. Voce sera avisado quando o modulo de parcerias for liberado.</p>
          )}
        </div>
      </section>
    </div>
  );
}