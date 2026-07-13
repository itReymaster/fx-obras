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
