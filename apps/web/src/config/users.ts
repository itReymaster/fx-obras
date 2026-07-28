export interface AuthorizedUserOption {
  value: string;
  label: string;
  aliases: string[];
}

const normalizeUserKey = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, "");

export const AUTHORIZED_USER_OPTIONS: AuthorizedUserOption[] = [
  { value: "adm", label: "adm", aliases: ["adm"] },
  { value: "Jefferson-Martins", label: "Jefferson Martins", aliases: ["jefferson martins", "jefferson-martins"] },
  { value: "ALISSON-COTRIM", label: "Alisson Cotrim", aliases: ["alisson", "alisson cotrim", "alisson-cotrim"] },
  { value: "Barbara-Cristina", label: "Barbara Cristina", aliases: ["barbara", "barbara cristina", "barbara-cristina"] },
  { value: "SILVA", label: "Silva", aliases: ["silva", "marcelo", "marcelo silva", "marcelo-silva"] },
  { value: "Elaine-Colaco", label: "Elaine Colaco", aliases: ["elaine", "elaine colaco", "elaine-colaco"] },
  { value: "Marcio-Barreto", label: "Marcio Barreto", aliases: ["marcio", "marcio barreto", "marcio-barreto"] },
];

export const AUTHORIZED_USERS = AUTHORIZED_USER_OPTIONS.map((option) => option.value);

const AUTHORIZED_USERS_LOOKUP = new Map<string, string>();

for (const option of AUTHORIZED_USER_OPTIONS) {
  AUTHORIZED_USERS_LOOKUP.set(normalizeUserKey(option.value), option.value);
  for (const alias of option.aliases) {
    AUTHORIZED_USERS_LOOKUP.set(normalizeUserKey(alias), option.value);
  }
}

export const resolveAuthorizedUser = (username: string): string | null => {
  const normalized = normalizeUserKey(username);
  return AUTHORIZED_USERS_LOOKUP.get(normalized) ?? null;
};

export const getAuthenticatedUser = (): string | undefined => {
  const value = localStorage.getItem("auth_user")?.trim() ?? sessionStorage.getItem("auth_user")?.trim();
  return value ? value : undefined;
};