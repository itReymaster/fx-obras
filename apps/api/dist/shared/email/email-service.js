import { Resend } from "resend";
import { env } from "../../config/env.js";
function createClient() {
    if (!env.resendApiKey)
        return null;
    return new Resend(env.resendApiKey);
}
export async function sendOpportunityNotification(event, opportunity) {
    const resend = createClient();
    if (!resend) {
        console.warn("[email] RESEND_API_KEY não configurado — e-mail não enviado.");
        return;
    }
    const label = event === "created" ? "Nova obra registrada" : "Obra atualizada";
    const potentialLabel = {
        HIGH: "Alto",
        MEDIUM: "Médio",
        LOW: "Baixo",
        NOT_EVALUATED: "Não avaliado",
    };
    const statusLabel = {
        DRAFT: "Rascunho",
        CAPTURED: "Capturada",
        UNDER_REVIEW: "Em análise",
        SENT_TO_PROSPECTING: "Encaminhada",
        PROSPECTING: "Em prospecção",
        CONVERTED: "Convertida",
        DISCARDED: "Descartada",
    };
    const location = [opportunity.city, opportunity.state].filter(Boolean).join("/") || "—";
    const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: #1e293b; padding: 20px 24px;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Digital Rey · Prospecção de Obras</p>
        <h2 style="margin: 6px 0 0; color: #f1f5f9; font-size: 18px;">${label}</h2>
      </div>
      <div style="padding: 24px; background: #fff;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 160px;">Código</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${opportunity.code}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Título</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${opportunity.title}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Localização</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${location}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Status</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${statusLabel[opportunity.status] ?? opportunity.status}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Potencial</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${potentialLabel[opportunity.commercialPotential ?? ""] ?? "—"}</td></tr>
          ${opportunity.contactName ? `<tr><td style="padding: 8px 0; color: #6b7280;">Contato</td><td style="padding: 8px 0;">${opportunity.contactName}${opportunity.contactPhone ? ` · ${opportunity.contactPhone}` : ""}</td></tr>` : ""}
        </table>
      </div>
      <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">Enviado automaticamente pelo sistema Digital Rey em ${new Date().toLocaleString("pt-BR")}</p>
      </div>
    </div>
  `;
    try {
        await resend.emails.send({
            from: "Digital Rey Obras <onboarding@resend.dev>",
            to: env.notificationEmail,
            subject: `[${opportunity.code}] ${label}: ${opportunity.title}`,
            html,
        });
        console.info(`[email] Notificação enviada para ${env.notificationEmail} — ${opportunity.code}`);
    }
    catch (err) {
        console.error("[email] Falha ao enviar notificação:", err);
    }
}
