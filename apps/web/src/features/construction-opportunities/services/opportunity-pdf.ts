import { jsPDF } from "jspdf";
import { APP_CONFIG } from "../../../config/app";
import { addressLabel, formatDate } from "../../../utils/format";
import { labels } from "../../../utils/labels";
import type { Opportunity } from "../types/opportunity.types";

interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
}

const loadImageAsDataUrl = async (url: string): Promise<PreparedImage | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();

    const rawDataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(blob);
    });

    if (!rawDataUrl) return null;

    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = rawDataUrl;
    });
    if (!image) return null;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const maxWidth = 1800;
    const scale = sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;

    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    return null;
  }
};

const normalizeFileName = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_]+/g, "-");

export const buildOpportunityPdf = async (opportunity: Opportunity): Promise<File> => {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const labelWidth = 44;
  const generatedAt = new Date().toLocaleString("pt-BR");
  let y = 36;

  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - 18) {
      doc.addPage();
      y = 16;
    }
  };

  const drawSectionHeader = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(236, 244, 255);
    doc.setDrawColor(168, 192, 226);
    doc.rect(margin, y, contentWidth, 8, "FD");
    doc.setTextColor(9, 59, 122);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin + 2.5, y + 5.3);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);
    y += 8;
  };

  const drawLabeledRow = (label: string, value: string) => {
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value || "-", contentWidth - labelWidth - 5);
    const rowHeight = Math.max(7, lines.length * 4 + 3);
    ensureSpace(rowHeight + 1);

    doc.setDrawColor(196, 210, 230);
    doc.rect(margin, y, contentWidth, rowHeight);
    doc.line(margin + labelWidth, y, margin + labelWidth, y + rowHeight);

    doc.setFont("helvetica", "bold");
    doc.text(label, margin + 2, y + 4.8);
    doc.setFont("helvetica", "normal");
    doc.text(lines, margin + labelWidth + 2.5, y + 4.8);
    y += rowHeight;
  };

  const drawParagraphBox = (text: string) => {
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, contentWidth - 6);
    const boxHeight = Math.max(18, lines.length * 4 + 6);
    ensureSpace(boxHeight + 1);
    doc.setDrawColor(196, 210, 230);
    doc.rect(margin, y, contentWidth, boxHeight);
    doc.text(lines, margin + 3, y + 5);
    y += boxHeight;
  };

  doc.setFillColor(9, 59, 122);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Solicitacao de Prospeccao Comercial", margin, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${APP_CONFIG.name} | ${APP_CONFIG.moduleName}`, margin, 19);
  doc.text(`Codigo: ${opportunity.code}`, margin, 24);

  doc.setTextColor(17, 24, 39);
  doc.setDrawColor(173, 193, 222);
  doc.setFillColor(246, 249, 255);
  doc.rect(margin, y, contentWidth, 18, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opportunity.title, margin + 3, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Capturada em ${formatDate(opportunity.capturedAt)}`, margin + 3, y + 13);
  y += 22;

  drawSectionHeader("Resumo da obra");
  drawLabeledRow("Status", labels.status(opportunity.status));
  drawLabeledRow("Potencial", labels.commercialPotential(opportunity.commercialPotential));
  drawLabeledRow(
    "Tipo/Estagio",
    `${labels.constructionType(opportunity.constructionType)} / ${labels.constructionStage(opportunity.constructionStage)}`,
  );
  drawLabeledRow("Codigo", opportunity.code);

  drawSectionHeader("Localizacao");
  drawLabeledRow("Endereco", addressLabel(opportunity));
  drawLabeledRow(
    "Cidade/UF",
    `${opportunity.city ?? "-"}/${opportunity.state ?? "-"} | Origem ${labels.addressSource(opportunity.addressSource)}`,
  );
  drawLabeledRow("Coordenadas", `${opportunity.latitude ?? "-"}, ${opportunity.longitude ?? "-"}`);

  drawSectionHeader("Contato e acao comercial");
  drawLabeledRow("Contato", opportunity.contactName ?? "Nao informado");
  drawLabeledRow("Telefone", opportunity.contactPhone ?? "-");
  drawLabeledRow("E-mail", opportunity.contactEmail ?? "-");
  drawLabeledRow("Proxima acao", `${opportunity.nextAction ?? "-"} (${formatDate(opportunity.nextActionDate)})`);

  drawSectionHeader("Observacoes");
  drawParagraphBox(opportunity.notes?.trim() || "Sem observacoes.");

  if (opportunity.photos.length > 0) {
    drawSectionHeader("Fotos da obra");
    const photoSlots = opportunity.photos.slice(0, 6);
    const cardWidth = 92;
    const cardHeight = 66;
    const imageAreaHeight = 58;

    const renderPhotoCard = async (photo: Opportunity["photos"][number], x: number, py: number, index: number) => {
      doc.setDrawColor(196, 210, 230);
      doc.setFillColor(251, 253, 255);
      doc.rect(x, py, cardWidth, cardHeight, "FD");

      const imageUrl = `${APP_CONFIG.uploadsBaseUrl}/${photo.relativePath}`;
      const prepared = await loadImageAsDataUrl(imageUrl);
      if (prepared) {
        const aspect = prepared.width / prepared.height;
        let drawWidth = cardWidth - 4;
        let drawHeight = drawWidth / aspect;
        if (drawHeight > imageAreaHeight - 4) {
          drawHeight = imageAreaHeight - 4;
          drawWidth = drawHeight * aspect;
        }
        const dx = x + (cardWidth - drawWidth) / 2;
        const dy = py + 2 + (imageAreaHeight - 4 - drawHeight) / 2;
        doc.addImage(prepared.dataUrl, "JPEG", dx, dy, drawWidth, drawHeight);
      } else {
        doc.setFontSize(9);
        doc.text("Imagem indisponivel", x + 4, py + 8);
      }

      doc.setFillColor(240, 245, 252);
      doc.rect(x, py + imageAreaHeight, cardWidth, cardHeight - imageAreaHeight, "F");
      doc.setFontSize(9);
      doc.setTextColor(68, 85, 111);
      doc.text(photo.isPrimary ? "Foto principal" : `Foto ${index + 1}`, x + 3, py + imageAreaHeight + 5.2);
      doc.setTextColor(17, 24, 39);
    };

    for (let rowStart = 0; rowStart < photoSlots.length; rowStart += 2) {
      ensureSpace(cardHeight + 6);
      const rowY = y;

      const left = photoSlots[rowStart];
      if (left) await renderPhotoCard(left, margin, rowY, rowStart);

      const right = photoSlots[rowStart + 1];
      if (right) await renderPhotoCard(right, margin + 98, rowY, rowStart + 1);

      y += cardHeight + 6;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `${APP_CONFIG.name} | ${APP_CONFIG.moduleName} | Documento gerado em ${generatedAt} | Pagina ${page}/${pageCount}`,
      margin,
      pageHeight - 6,
    );
  }

  const blob = doc.output("blob");
  const safeTitle = normalizeFileName(opportunity.title || opportunity.code);
  return new File([blob], `solicitacao-prospeccao-${safeTitle}.pdf`, {
    type: "application/pdf",
  });
};
