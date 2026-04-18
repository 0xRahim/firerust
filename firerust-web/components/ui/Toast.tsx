"use client";

import { useApp } from "@/context/AppContext";
import { Toast, ToastType } from "@/lib/types";

const icons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const styles: Record<ToastType, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-sky-50 border-sky-200 text-sky-800",
};

const iconStyles: Record<ToastType, string> = {
  success: "bg-emerald-100 text-emerald-600",
  error: "bg-red-100 text-red-600",
  warning: "bg-amber-100 text-amber-600",
  info: "bg-sky-100 text-sky-600",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={`flex items-start gap-3 w-80 rounded-xl border px-4 py-3 shadow-lg ${styles[toast.type]}`}
    >
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${iconStyles[toast.type]}`}
      >
        {icons[toast.type]}
      </span>
      <p className="text-sm flex-1 leading-relaxed">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </div>
  );
}