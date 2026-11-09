"use client";

import React from "react";
import { AlertTriangle, Trash2, HelpCircle, X } from "lucide-react";
import { useConfirmStore } from "@/store/useConfirmStore";

export function ConfirmModal() {
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmStore();

  if (!isOpen) return null;

  const {
    title,
    message,
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    variant = "default",
  } = options;

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-md bg-surface border border-hairline rounded-xl shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-100">
        <button
          type="button"
          onClick={handleCancel}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
              isDanger
                ? "bg-danger-subtle border-danger-border text-danger"
                : isWarning
                ? "bg-warning-subtle border-warning-border text-warning"
                : "bg-surface-raised border-hairline text-accent"
            }`}
          >
            {isDanger ? (
              <Trash2 className="w-4 h-4" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <HelpCircle className="w-4 h-4" />
            )}
          </div>

          <div className="space-y-1 pr-4">
            <h3 className="font-display text-base font-medium text-text-ivory">
              {title || (isDanger ? "Confirmar eliminación" : isWarning ? "Cambios sin guardar" : "¿Estás seguro?")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-hairline/60">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-xs ${
              isDanger
                ? "bg-danger text-text-ivory hover:bg-danger/90"
                : "btn-accent"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
