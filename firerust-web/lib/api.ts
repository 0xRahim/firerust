import {
  AuthUser,
  Collection,
  CollectionsResponse,
  FileRecord,
  LoginResponse,
  Project,
} from "./types";
import { getConfig, getToken } from "./storage";

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

type FetchOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  adminKey?: string;
  isFormData?: boolean;
  formData?: FormData;
};

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { apiUrl, adminKey: storedAdminKey } = getConfig();
  const url = `${apiUrl}${path}`;

  const headers: Record<string, string> = {};

  if (!opts.isFormData && opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (opts.token) {
    headers["Authorization"] = `Bearer ${opts.token}`;
  }
  const adminKey = opts.adminKey ?? storedAdminKey;
  if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.formData
      ? opts.formData
      : opts.body !== undefined
      ? JSON.stringify(opts.body)
      : undefined,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Health ───────────────────────────────────────────────────────────────────

export const healthApi = {
  check: () => apiFetch<{ status: string }>("/health"),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  listProjects: () => apiFetch<Project[]>("/admin/projects"),
  createProject: (data: { name: string; description?: string }) =>
    apiFetch<Project>("/admin/projects", { method: "POST", body: data }),
  getProject: (id: string) => apiFetch<Project>(`/admin/projects/${id}`),
  deleteProject: (id: string) =>
    apiFetch<void>(`/admin/projects/${id}`, { method: "DELETE" }),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (
    projectId: string,
    data: { email: string; password: string; metadata?: Record<string, unknown> }
  ) =>
    apiFetch<AuthUser>(`/api/${projectId}/auth/register`, {
      method: "POST",
      body: data,
    }),

  login: (projectId: string, data: { email: string; password: string }) =>
    apiFetch<LoginResponse>(`/api/${projectId}/auth/login`, {
      method: "POST",
      body: data,
    }),

  me: (projectId: string) =>
    apiFetch<AuthUser>(`/api/${projectId}/auth/me`, {
      token: getToken(projectId),
    }),

  listUsers: (projectId: string) =>
    apiFetch<AuthUser[]>(`/api/${projectId}/auth/users`),

  deleteUser: (projectId: string, userId: string) =>
    apiFetch<void>(`/api/${projectId}/auth/users/${userId}`, {
      method: "DELETE",
    }),
};

// ─── Files ────────────────────────────────────────────────────────────────────

export const filesApi = {
  upload: (projectId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<FileRecord>(`/api/${projectId}/files/upload`, {
      method: "POST",
      token: getToken(projectId),
      isFormData: true,
      formData: fd,
    });
  },

  list: (projectId: string) =>
    apiFetch<FileRecord[]>(`/api/${projectId}/files`, {
      token: getToken(projectId),
    }),

  getMeta: (projectId: string, fileId: string) =>
    apiFetch<FileRecord>(`/api/${projectId}/files/${fileId}`, {
      token: getToken(projectId),
    }),

  downloadUrl: (projectId: string, fileId: string) => {
    const { apiUrl } = getConfig();
    return `${apiUrl}/api/${projectId}/files/${fileId}/download`;
  },

  delete: (projectId: string, fileId: string) =>
    apiFetch<void>(`/api/${projectId}/files/${fileId}`, {
      method: "DELETE",
      token: getToken(projectId),
    }),
};

// ─── DB ───────────────────────────────────────────────────────────────────────

export const dbApi = {
  listCollections: (projectId: string) =>
    apiFetch<CollectionsResponse>(`/api/${projectId}/db/collections`, {
      token: getToken(projectId),
    }),

  createCollection: (
    projectId: string,
    data: { name: string; schema?: Record<string, unknown> }
  ) =>
    apiFetch<Collection>(`/api/${projectId}/db/collections`, {
      method: "POST",
      token: getToken(projectId),
      body: data,
    }),

  listDocuments: (projectId: string, collectionId: string) =>
    apiFetch<{ collection_id: string; documents: unknown[]; note: string }>(
      `/api/${projectId}/db/collections/${collectionId}/documents`,
      { token: getToken(projectId) }
    ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isImageType(contentType: string): boolean {
  return contentType.startsWith("image/");
}