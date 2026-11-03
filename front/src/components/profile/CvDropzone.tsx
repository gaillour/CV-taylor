"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, Loader2, AlertCircle, Languages, CheckCircle2 } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import { SourceLangOption } from "@/types/cv";

interface CvDropzoneProps {
  onSuccess?: () => void;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function CvDropzone({ onSuccess, className = "" }: CvDropzoneProps) {
  const { importProfile, importing, error, lastImportInfo, profile } = useProfileStore();
  const [sourceLang, setSourceLang] = useState<SourceLangOption>("auto");
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayError = localError || error;

  const handleFile = async (file: File) => {
    setLocalError(null);

    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".pdf") && !ext.endsWith(".txt")) {
      setLocalError("Formato no soportado. Seleccioná un archivo .pdf o .txt.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setLocalError("El archivo supera el tamaño máximo permitido de 5 MB.");
      return;
    }

    const ok = await importProfile(file, sourceLang);
    if (ok) {
      if (onSuccess) onSuccess();
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!importing) setIsDragging(true);
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
    if (importing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !importing && fileInputRef.current?.click()}
        className={`relative border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition select-none ${
          isDragging
            ? "border-zinc-400 bg-zinc-900/80"
            : "border-white/[0.1] hover:border-white/[0.2] bg-zinc-950/60 hover:bg-zinc-900/30"
        } ${importing ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={onFileChange}
          className="hidden"
          disabled={importing}
        />

        {importing ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-2.5">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-zinc-100">
                Procesando currículum...
              </p>
              <p className="text-[11px] text-zinc-400">
                Extrayendo experiencia, logros y habilidades.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300">
              <UploadCloud className="w-5 h-5 text-zinc-400" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-200">
                Hacé click para seleccionar o arrastrá tu CV
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Archivos .pdf o .txt (hasta 5 MB)
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/[0.06]">
                <FileText className="w-3 h-3 text-zinc-500" />
                1 o 2 columnas
              </span>
              <span className="bg-zinc-900 px-2 py-0.5 rounded border border-white/[0.06]">
                Estructuración asistida
              </span>
            </div>
          </div>
        )}

        {/* Source language selector toggle */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-4 pt-3 border-t border-white/[0.06] w-full flex items-center justify-between text-xs text-zinc-400 px-2 font-mono"
        >
          <div className="flex items-center gap-1.5 text-[11px]">
            <Languages className="w-3 h-3 text-zinc-500" />
            <span>Idioma del CV:</span>
          </div>
          <div className="inline-flex rounded-md bg-zinc-900 p-0.5 border border-white/[0.08] text-[10px]">
            <button
              type="button"
              disabled={importing}
              onClick={() => setSourceLang("auto")}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                sourceLang === "auto"
                  ? "bg-zinc-800 text-zinc-100 font-medium border border-white/[0.06]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Auto
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => setSourceLang("es")}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                sourceLang === "es"
                  ? "bg-zinc-800 text-zinc-100 font-medium border border-white/[0.06]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ES
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => setSourceLang("en")}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                sourceLang === "en"
                  ? "bg-zinc-800 text-zinc-100 font-medium border border-white/[0.06]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {lastImportInfo?.translatedToBase && (
        <div className="mt-3 p-3 rounded-md bg-zinc-900 border border-white/[0.08] text-zinc-300 text-xs flex items-center gap-2 font-mono text-[11px]">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>
            CV detectado en <strong>{lastImportInfo.detectedLang === "en" ? "inglés" : "español"}</strong> y traducido al idioma base ({profile?.base_lang?.toUpperCase() || "ES"}).
          </span>
        </div>
      )}

      {displayError && (
        <div className="mt-3 p-2.5 rounded-md bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 font-mono text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
