"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppConfig, Project, Toast, ToastType } from "@/lib/types";
import { getConfig, saveConfig } from "@/lib/storage";

interface AppContextValue {
  config: AppConfig;
  updateConfig: (c: Partial<AppConfig>) => void;
  projects: Project[];
  setProjects: (p: Project[]) => void;
  toasts: Toast[];
  toast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>({
    apiUrl: "http://localhost:4000",
    adminKey: "",
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setConfig(getConfig());
  }, []);

  const updateConfig = useCallback((updates: Partial<AppConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(updates);
      return next;
    });
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <AppContext.Provider
      value={{ config, updateConfig, projects, setProjects, toasts, toast, dismissToast }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}