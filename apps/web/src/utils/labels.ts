const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  CAPTURED: "Capturada",
  UNDER_REVIEW: "Em analise",
  SENT_TO_PROSPECTING: "Encaminhada para prospeccao",
  PROSPECTING: "Em prospeccao",
  CONVERTED: "Convertida em oportunidade",
  DISCARDED: "Descartada",
};

const constructionTypeLabels: Record<string, string> = {
  RESIDENTIAL: "Residencial",
  COMMERCIAL: "Comercial",
  INDUSTRIAL: "Industrial",
  INFRASTRUCTURE: "Infraestrutura",
  PUBLIC: "Publica",
  RENOVATION: "Reforma",
  EXPANSION: "Expansao",
  UNKNOWN: "Nao identificado",
  OTHER: "Outro",
};

const stageLabels: Record<string, string> = {
  SITE_PREPARATION: "Terreno ou preparacao",
  FOUNDATION: "Fundacao",
  STRUCTURE: "Estrutura",
  MASONRY: "Alvenaria",
  ROOFING: "Cobertura",
  INSTALLATIONS: "Instalacoes",
  FINISHING: "Acabamento",
  PAUSED: "Obra aparentemente paralisada",
  COMPLETED: "Obra concluida",
  UNKNOWN: "Nao identificado",
};

const potentialLabels: Record<string, string> = {
  LOW: "Baixo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  NOT_EVALUATED: "Ainda nao avaliado",
};

const addressSourceLabels: Record<string, string> = {
  GPS: "GPS",
  MANUAL: "Manual",
};

const crmStatusLabels: Record<string, string> = {
  NOT_SENT: "Nao enviado",
  PENDING: "Pendente",
  SENT: "Enviado",
  ERROR: "Erro",
};

const labelOrValue = (map: Record<string, string>, value?: string | null): string => {
  if (!value) return "-";
  return map[value] ?? value;
};

export const labels = {
  status: (value?: string | null) => labelOrValue(statusLabels, value),
  constructionType: (value?: string | null) => labelOrValue(constructionTypeLabels, value),
  constructionStage: (value?: string | null) => labelOrValue(stageLabels, value),
  commercialPotential: (value?: string | null) => labelOrValue(potentialLabels, value),
  addressSource: (value?: string | null) => labelOrValue(addressSourceLabels, value),
  crmStatus: (value?: string | null) => labelOrValue(crmStatusLabels, value),
};

export const constructionTypeOptions = Object.entries(constructionTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

export const constructionStageOptions = Object.entries(stageLabels).map(([value, label]) => ({
  value,
  label,
}));

export const commercialPotentialOptions = Object.entries(potentialLabels).map(([value, label]) => ({
  value,
  label,
}));
