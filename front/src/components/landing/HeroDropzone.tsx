"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { parseAnonymousCv } from "@/lib/api";
import { saveDraft, clearDraft } from "@/lib/draft";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const PARSING_STAGES = [
  "Leyendo tu CV…",
  "Ordenando experiencia y logros…",
  "Armando tu perfil…",
  "Ajustando el corte final…",
];

export function HeroDropzone() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStageIdx, setParsingStageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Ciclo de micro-feedback durante el parsing
  useEffect(() => {
    if (!isParsing) return;

    const interval = setInterval(() => {
      setParsingStageIdx((prev) => (prev + 1) % PARSING_STAGES.length);
    }, 2400);

    return () => {
      clearInterval(interval);
      setParsingStageIdx(0);
    };
  }, [isParsing]);

  const handleProcessFile = async (file: File) => {
    setError(null);
    setIsSuccess(false);

    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".pdf") && !ext.endsWith(".txt")) {
      setError("Formato no soportado. Seleccioná un archivo en formato .pdf o .txt.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("El archivo supera el tamaño máximo permitido de 5 MB.");
      return;
    }

    setIsParsing(true);

    try {
      const response = await parseAnonymousCv(file);
      if (response && response.profile) {
        saveDraft(response.profile);
        setIsSuccess(true);
        // Breve pausa para micro-feedback de éxito antes de navegar
        setTimeout(() => {
          router.push("/editor");
        }, 500);
      } else {
        throw new Error("No se pudo estructurar el contenido del CV.");
      }
    } catch (err: unknown) {
      console.error("Error en parseAnonymousCv:", err);
      const msg = err instanceof Error ? err.message : "Error al procesar el archivo.";
      setError(msg);
      setIsParsing(false);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isParsing) setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isParsing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleStartFromScratch = () => {
    clearDraft();
    router.push("/editor");
  };

  return (
    <div className="w-full space-y-4">
      {/* Dropzone Container */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isParsing && fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (!isParsing && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={isParsing ? -1 : 0}
        aria-label="Subí tu CV actual en formato PDF o TXT"
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 transition-all duration-300 select-none cursor-pointer flex flex-col items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)] ${
          isDragging
            ? "border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_30px_rgba(225,163,74,0.2)] scale-[1.01]"
            : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] hover:border-[var(--accent-border)] shadow-md"
        } ${isParsing ? "pointer-events-none opacity-95" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={onFileInputChange}
          className="hidden"
          disabled={isParsing}
        />

        {isSuccess ? (
          <div className="py-4 space-y-3 flex flex-col items-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[var(--green-subtle)] border border-[var(--green-border)] flex items-center justify-center text-[var(--green-text)] shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-ivory)]">
                CV listo.
              </p>
              <p className="text-xs text-[var(--text-secondary)] font-mono">
                Abriendo el editor…
              </p>
            </div>
          </div>
        ) : isParsing ? (
          <div className="py-5 space-y-4 flex flex-col items-center max-w-sm">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)]">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent)] animate-ping opacity-60" />
            </div>

            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] font-mono">
                Ajustando CV
              </p>
              <p aria-live="polite" className="text-sm text-[var(--text-ivory)] font-medium transition-all duration-300">
                {PARSING_STAGES[parsingStageIdx]}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-2 space-y-3.5 flex flex-col items-center">
            {/* Icono con tijera atelier */}
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform duration-200 shadow-sm">
              <UploadCloud className="w-6 h-6 text-[var(--accent)]" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <p className="text-sm sm:text-base font-semibold text-[var(--text-ivory)]">
                Subí tu CV
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                PDF o TXT · hasta 5 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cartel de Error */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-subtle)] p-3.5 text-xs text-[var(--danger)] font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <span className="leading-relaxed block">{error}</span>
            {error.toLowerCase().includes("límite") && (
              <p className="text-[11px] text-[var(--text-secondary)]">
                ¿Querés seguir probando?{" "}
                <Link
                  href="/login"
                  className="text-[var(--accent)] underline hover:text-[var(--accent-hover)] font-sans font-medium"
                >
                  Iniciá sesión gratis
                </Link>{" "}
                para obtener más adaptaciones.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-3 pt-1 text-xs sm:flex-row">
        <span className="text-center font-mono text-[10px] text-[var(--text-muted)] sm:text-left">
          Sin cuenta · no se guarda hasta que lo pidas.
        </span>
        <button
          type="button"
          onClick={handleStartFromScratch}
          className="shrink-0 font-medium text-[var(--accent)] underline underline-offset-4 transition-colors hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Empezá de cero →
        </button>
      </div>
    </div>
  );
}
