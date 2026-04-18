"use client";

import React from "react";

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#c96a2a] hover:bg-[#b85e24] text-white border border-[#b85e24] shadow-sm",
  secondary:
    "bg-white hover:bg-[#faf7f4] text-[#1c1917] border border-[#e8e2da] shadow-sm",
  ghost: "bg-transparent hover:bg-[#f5f0eb] text-[#57534e] border border-transparent",
  danger:
    "bg-white hover:bg-red-50 text-red-600 border border-red-200 shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, hint, error, icon, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]">
            {icon}
          </span>
        )}
        <input
          className={`w-full h-9 rounded-lg border border-[#e8e2da] bg-white px-3 text-sm text-[#1c1917] placeholder-[#c4bdb7] transition-all duration-150 outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15 disabled:bg-[#faf7f4] disabled:cursor-not-allowed ${icon ? "pl-9" : ""} ${error ? "border-red-400 focus:border-red-400 focus:ring-red-400/15" : ""} ${className}`}
          {...props}
        />
      </div>
      {hint && <p className="text-xs text-[#a8a29e]">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ label, hint, className = "", ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        className={`w-full rounded-lg border border-[#e8e2da] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder-[#c4bdb7] transition-all duration-150 outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15 resize-none ${className}`}
        {...props}
      />
      {hint && <p className="text-xs text-[#a8a29e]">{hint}</p>}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const badgeClasses: Record<BadgeVariant, string> = {
  default: "bg-[#f5f0eb] text-[#78716c]",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-600",
  info: "bg-sky-50 text-sky-700",
};

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${badgeClasses[variant]}`}
    >
      {children}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-6 h-6" }[size];
  return (
    <svg
      className={`${s} animate-spin text-current`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-[#e8e2da] shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#f5f0eb] flex items-center justify-center text-[#c4bdb7] mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-[#1c1917] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[#a8a29e] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#a8a29e] uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-2xl font-semibold text-[#1c1917] font-mono">{value}</p>
          {sub && <p className="text-xs text-[#a8a29e] mt-1">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-lg bg-[#fdf5ef] flex items-center justify-center text-[#c96a2a]">
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-base font-semibold text-[#1c1917]">{title}</h2>
        {description && (
          <p className="text-sm text-[#a8a29e] mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider() {
  return <hr className="border-[#e8e2da] my-6" />;
}

// ─── Code block ───────────────────────────────────────────────────────────────

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-[#f5f0eb] text-[#c96a2a] px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  );
}