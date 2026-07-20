export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "-";
  return date.toLocaleDateString("pt-BR");
};

export const addressLabel = (item: {
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
}) => {
  if (item.street) return `${item.street}${item.number ? `, ${item.number}` : ""}`;
  if (item.district && item.city) return `${item.district} - ${item.city}`;
  return "Endereço não informado";
};

const normalizeUserKey = (userId: string) => userId.trim().toLowerCase().replace(/[\s-]+/g, "");

const canonicalUserLabels: Record<string, string> = {
  alissoncotrim: "ALISSON-COTRIM",
  silva: "SILVA",
};

export const formatUserDisplay = (userId?: string | null): string => {
  if (!userId || userId.trim().length === 0) return "Usuário não identificado";
  return canonicalUserLabels[normalizeUserKey(userId)] ?? userId.replaceAll("-", " ");
};

export const mergeUserRankings = <T extends { userId: string | null; count: number }>(items: T[]) => {
  const merged = new Map<string, { userId: string | null; userLabel: string; count: number }>();

  for (const item of items) {
    const userLabel = formatUserDisplay(item.userId);
    const key = normalizeUserKey(userLabel);
    const current = merged.get(key);

    if (current) {
      current.count += item.count;
      continue;
    }

    merged.set(key, {
      userId: item.userId,
      userLabel,
      count: item.count,
    });
  }

  return [...merged.values()].sort((a, b) => b.count - a.count);
};
