import React from "react";
import { Profile } from "@/types/cv";
import { Field } from "./Field";

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
  return (
    <div className="space-y-8">
      {/* Datos Personales y Contacto */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Datos Personales y Contacto</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Información de cabecera para tus CVs y enlaces de contacto.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre Completo">
            <input
              type="text"
              value={fullName}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onUpdateFullName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition disabled:opacity-70"
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition disabled:opacity-70"
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition disabled:opacity-70"
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition disabled:opacity-70"
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition disabled:opacity-70"
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition disabled:opacity-70"
            />
          </Field>
        </div>
      </section>

      {/* Resumen Profesional */}
      <section className="pt-6 border-t border-zinc-800/80 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Resumen Profesional</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
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
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-y transition disabled:opacity-70"
          />
        </Field>
      </section>
    </div>
  );
}
