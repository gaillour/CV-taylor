"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { parseAnonymousCv } from "@/lib/api";
import { saveDraft, clearDraft } from "@/lib/draft";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const PARSING_STAGES = [
  "Descosiendo el documento y tomando medidas iniciales...",
  "Extrayendo experiencia laboral, cargos y logros...",
  "Estructurando habilidades técnicas y educación...",
  "Ajustando corte final al milímetro...",
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
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 transition-all duration-300 select-none cursor-pointer flex flex-col items-center justify-center text-center ${
          isDragging
            ? "border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_30px_rgba(212,151,59,0.2)] scale-[1.01]"
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
                ¡CV adaptado al taller sastre!
              </p>
              <p className="text-xs text-[var(--text-secondary)] font-mono">
                Abriendo el editor interactivo...
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
                Corte a Medida en Proceso
              </p>
              <p className="text-sm text-[var(--text-ivory)] font-medium transition-all duration-300">
                {PARSING_STAGES[parsingStageIdx]}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono pt-1">
                Extracción limpia sin inventar datos
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
                Subí tu CV actual para empezar
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Arrastrá acá tu archivo <span className="font-mono text-[var(--text-ivory)]">.PDF</span> o{" "}
                <span className="font-mono text-[var(--text-ivory)]">.TXT</span>, o hacé click para elegirlo.
              </p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Hasta 5 MB • Extraemos tu experiencia automáticamente
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

      {/* Microcopy, CTA secundario y Compromisos */}
      <div className="space-y-3 pt-1">
        {/* Fila 1: Microcopy de privacidad & CTA Empezar de cero */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-[var(--green-text)] shrink-0" />
            <span>Sin cuenta. No guardamos nada hasta que vos lo pidas.</span>
          </div>

          <button
            type="button"
            onClick={handleStartFromScratch}
            className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-4 font-medium transition-colors cursor-pointer shrink-0"
          >
            o empezá de cero →
          </button>
        </div>

        {/* Fila 2: Descarga PDF gratis ilimitada & GitHub open source */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-hairline)] text-xs text-[var(--text-muted)] font-mono">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span className="text-[var(--text-ivory)] font-medium">Descarga de PDF gratis e ilimitada.</span>
          </div>

          <a
            href="https://github.com/gaillour"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>Open source — ver código</span>
          </a>
        </div>
      </div>
    </div>
  );
}
