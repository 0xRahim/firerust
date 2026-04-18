import { AppConfig } from "./types";

const KEYS = {
  apiUrl: "fr_api_url",
  adminKey: "fr_admin_key",
  token: (projectId: string) => `fr_token_${projectId}`,
  user: (projectId: string) => `fr_user_${projectId}`,
};

export function getConfig(): AppConfig {
  if (typeof window === "undefined")
    return { apiUrl: "http://localhost:4000", adminKey: "" };
  return {
    apiUrl: localStorage.getItem(KEYS.apiUrl) ?? "http://localhost:4000",
    adminKey: localStorage.getItem(KEYS.adminKey) ?? "",
  };
}

export function saveConfig(config: Partial<AppConfig>) {
  if (config.apiUrl !== undefined) localStorage.setItem(KEYS.apiUrl, config.apiUrl);
  if (config.adminKey !== undefined) localStorage.setItem(KEYS.adminKey, config.adminKey);
}

export function getToken(projectId: string): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem(KEYS.token(projectId))
    : null;
}

export function setToken(projectId: string, token: string) {
  localStorage.setItem(KEYS.token(projectId), token);
}

export function clearToken(projectId: string) {
  localStorage.removeItem(KEYS.token(projectId));
  localStorage.removeItem(KEYS.user(projectId));
}

export function getStoredUser(projectId: string) {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.user(projectId));
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(projectId: string, user: unknown) {
  localStorage.setItem(KEYS.user(projectId), JSON.stringify(user));
}