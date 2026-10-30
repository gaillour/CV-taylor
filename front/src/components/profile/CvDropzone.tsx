"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, Loader2, AlertCircle } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";

interface CvDropzoneProps {
  onSuccess?: () => void;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function CvDropzone({ onSuccess, className = "" }: CvDropzoneProps) {
  const { importProfile, importing, error } = useProfileStore();
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayError = localError || error;

  const handleFile = async (file: File) => {
    setLocalError(null);

    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".pdf") && !ext.endsWith(".txt")) {
      setLocalError("Formato no soportado. Por favor seleccioná un archivo .pdf o .txt.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setLocalError("El archivo supera el tamaño máximo permitido de 5 MB.");
      return;
    }

    const ok = await importProfile(file);
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
      // Reset input value so re-selecting same file triggers onChange
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
        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition select-none ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
            : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/70 hover:bg-zinc-900/50"
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
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-100">
                Procesando currículum...
              </p>
              <p className="text-xs text-zinc-400">
                Extrayendo experiencia, logros y habilidades.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-sm group-hover:scale-105 transition">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-200">
                <span className="text-emerald-400 font-semibold underline underline-offset-4">
                  Hacé click para seleccionar
                </span>{" "}
                o arrastrá tu CV acá
              </p>
              <p className="text-xs text-zinc-400">
                Archivos compatibles: <span className="text-zinc-300 font-mono">.PDF</span> o{" "}
                <span className="text-zinc-300 font-mono">.TXT</span> (hasta 5 MB)
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                1 o 2 columnas soportadas
              </span>
              <span className="bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">
                Estructuración asistida con IA
              </span>
            </div>
          </div>
        )}
      </div>

      {displayError && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
