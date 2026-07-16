export const AUTHORIZED_USERS = [
  "adm",
  "Jefferson-Martins",
  "Alisson-Cotrim",
  "Barbara-Cristina",
  "Marcelo-Silva",
  "Elaine-Colaco",
  "Marcio-Barreto",
];

const AUTHORIZED_USERS_LOOKUP = new Map(
  AUTHORIZED_USERS.map((user) => [user.toLowerCase(), user]),
);

export const resolveAuthorizedUser = (username: string): string | null => {
  const normalized = username.trim().toLowerCase();
  return AUTHORIZED_USERS_LOOKUP.get(normalized) ?? null;
};

export const getAuthenticatedUser = (): string | undefined => {
  const value = localStorage.getItem("auth_user")?.trim();
  return value ? value : undefined;
};