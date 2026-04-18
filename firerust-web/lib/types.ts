// ─── API config ───────────────────────────────────────────────────────────────
export interface AppConfig {
  apiUrl: string;
  adminKey: string;
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  project_id: string;
  email: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ─── Files ────────────────────────────────────────────────────────────────────
export interface FileRecord {
  id: string;
  project_id: string;
  user_id: string | null;
  filename: string;
  original_name: string;
  content_type: string;
  size: number;
  path: string;
  created_at: string;
}

// ─── DB ───────────────────────────────────────────────────────────────────────
export interface Collection {
  id: string;
  name: string;
  schema: Record<string, unknown>;
  created_at: string;
}

export interface CollectionsResponse {
  collections: Collection[];
  note: string;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}