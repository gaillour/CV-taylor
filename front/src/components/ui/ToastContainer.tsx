"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore, ToastItem } from "@/store/useToastStore";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastMessage({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-lg border shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-2 duration-150 ${
        isError
          ? "bg-surface border-danger-border text-danger"
          : isSuccess
          ? "bg-surface border-green-border text-text-primary"
          : "bg-surface border-hairline text-text-primary"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-green-text shrink-0" />
        ) : isError ? (
          <AlertCircle className="w-4 h-4 text-danger shrink-0" />
        ) : (
          <Info className="w-4 h-4 text-accent shrink-0" />
        )}
        <p className="text-xs font-mono truncate">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
