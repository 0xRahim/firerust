"use client";

import React, { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-md",
}: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* panel */}
      <div
        className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-[#e8e2da] animate-in`}
      >
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-base font-semibold text-[#1c1917]">{title}</h2>
            {description && (
              <p className="text-sm text-[#a8a29e] mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#a8a29e] hover:text-[#1c1917] hover:bg-[#f5f0eb] transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  loading = false,
}: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <p className="text-sm text-[#78716c] mb-6">{message}</p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="h-9 px-4 text-sm rounded-lg border border-[#e8e2da] text-[#78716c] hover:bg-[#faf7f4] transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="h-9 px-4 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}