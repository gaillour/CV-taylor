import React, { useRef, useState } from "react";
import { Profile } from "@/types/cv";
import { Field } from "./Field";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useCvStore } from "@/store/useCvStore";
import { Camera, Trash2, Loader2, User } from "lucide-react";

export function GeneralTab({
  fullName,
  contact,
  summary,
  readOnly = false,
  onUpdateFullName,
  onUpdateContact,
  onUpdateSummary,
}: {
  fullName: string;
  contact: Profile["contact"];
  summary: string;
  readOnly?: boolean;
  onUpdateFullName: (name: string) => void;
  onUpdateContact: (c: Partial<Profile["contact"]>) => void;
  onUpdateSummary: (s: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("La imagen no debe superar los 2 MB");
      return;
    }

    try {
      setUploading(true);
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al subir la imagen");
      }

      const data = await res.json();
      onUpdateContact({ photo_url: data.photo_url });

      // Sync active draft in Editor if loaded
      const cvStore = useCvStore.getState();
      if (cvStore.renderModel) {
        cvStore.updateModel((prev) => ({
          ...prev,
          contact: { ...prev.contact, photo_url: data.photo_url },
          photo_path: data.photo_url,
        }));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al subir avatar");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setUploading(true);
      setErrorMsg(null);
      const res = await apiFetch("/api/profile/avatar", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar foto");
      onUpdateContact({ photo_url: null });

      // Sync active draft in Editor if loaded
      const cvStore = useCvStore.getState();
      if (cvStore.renderModel) {
        cvStore.updateModel((prev) => ({
          ...prev,
          contact: { ...prev.contact, photo_url: null },
          photo_path: null,
        }));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al eliminar foto");
    } finally {
      setUploading(false);
    }
  };

  const avatarDisplayUrl = contact.photo_url
    ? contact.photo_url.startsWith("http")
      ? contact.photo_url
      : `${API_BASE_URL}${contact.photo_url}`
    : null;

  return (
    <div className="space-y-8">
      {/* Datos Personales y Contacto */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-text-ivory">Datos Personales y Contacto</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Información de cabecera para tus CVs y enlaces de contacto.
          </p>
        </div>

        {/* Avatar / Foto de Perfil */}
        <div className="flex items-center gap-4 p-3 bg-surface-raised/60 border border-hairline rounded-xl">
          <div className="relative w-16 h-16 rounded-full bg-surface border border-hairline overflow-hidden shrink-0 flex items-center justify-center">
            {avatarDisplayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarDisplayUrl}
                alt={fullName || "Avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-text-muted" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-canvas/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary">Foto / Avatar</div>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Utilizada en plantillas visuales con foto (JPG, PNG o WebP, máx 2 MB).
            </p>
            {errorMsg && <p className="text-[11px] text-danger mt-1">{errorMsg}</p>}

            {!readOnly && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {contact.photo_url ? "Cambiar foto" : "Subir foto"}
                </button>

                {contact.photo_url && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleDeleteAvatar}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-danger-subtle hover:bg-danger/20 border border-danger-border text-danger rounded transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Quitar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre Completo">
            <input
              type="text"
              value={fullName}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onUpdateFullName(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus-ring transition disabled:opacity-70"
              placeholder="Juan Pérez"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={contact.email}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onUpdateContact({ email: e.target.value })}
              className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus-ring transition disabled:opacity-70"
              placeholder="juan@ejemplo.com"
            />
          </Field>

          <Field label="Teléfono">
            <input
              type="text"
              value={contact.phone}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onUpdateContact({ phone: e.target.value })}
              className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus-ring transition disabled:opacity-70"
              placeholder="+54 9 11 1234-5678"
            />
          </Field>

          <Field label="Ubicación">
            <input
              type="text"
              value={contact.location}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onUpdateContact({ location: e.target.value })}
              className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus-ring transition disabled:opacity-70"
              placeholder="Buenos Aires, Argentina"
            />
          </Field>

          <Field label="GitHub">
            <input
              type="text"
              value={contact.github || ""}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onUpdateContact({ github: e.target.value })}
              placeholder="github.com/usuario"
              className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus-ring transition disabled:opacity-70 font-mono"
            />
          </Field>

          <Field label="LinkedIn">
            <input
              type="text"
              value={contact.linkedin || ""}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onUpdateContact({ linkedin: e.target.value })}
              placeholder="linkedin.com/in/usuario"
              className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus-ring transition disabled:opacity-70 font-mono"
            />
          </Field>
        </div>
      </section>

      {/* Resumen Profesional */}
      <section className="pt-6 border-t border-hairline space-y-4">
        <div>
          <h2 className="text-sm font-medium text-text-ivory">Resumen Profesional</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Párrafo de introducción profesional para tus CVs.
          </p>
        </div>

        <Field label="Resumen">
          <textarea
            rows={3}
            value={summary}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => onUpdateSummary(e.target.value)}
            placeholder="Desarrollador de software con experiencia en..."
            className="w-full bg-canvas border border-hairline rounded-lg p-3 text-xs text-text-primary placeholder:text-text-muted focus-ring resize-y transition disabled:opacity-70"
          />
        </Field>
      </section>
    </div>
  );
}
