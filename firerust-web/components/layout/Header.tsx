"use client";

import { useEffect, useState } from "react";
import { healthApi } from "@/lib/api";
import { useApp } from "@/context/AppContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const { config } = useApp();

  useEffect(() => {
    let cancelled = false;
    healthApi.check()
      .then(() => { if (!cancelled) setServerOk(true); })
      .catch(() => { if (!cancelled) setServerOk(false); });
    return () => { cancelled = true; };
  }, [config.apiUrl]);

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-[#e8e2da] bg-white">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-semibold text-[#1c1917] leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[#a8a29e] leading-tight mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Server status pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#faf7f4] border border-[#e8e2da]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              serverOk === null
                ? "bg-[#c4bdb7] animate-pulse"
                : serverOk
                ? "bg-emerald-500"
                : "bg-red-400"
            }`}
          />
          <span className="text-[10px] font-medium text-[#a8a29e]">
            {serverOk === null ? "checking" : serverOk ? "online" : "offline"}
          </span>
        </div>
        {actions}
      </div>
    </header>
  );
}