"use client";

import React from "react";
import { ContactInfo } from "@/types/cv";

interface HeaderSectionProps {
  fullName: string;
  contact: ContactInfo;
  onChange: (updates: { fullName?: string; contact?: ContactInfo }, debounceMs?: number) => void;
}

export function HeaderSection({ fullName, contact, onChange }: HeaderSectionProps) {
  return (
    <div className="space-y-3 text-xs">
      <div>
        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
          Nombre Completo
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => onChange({ fullName: e.target.value }, 150)}
          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            Email
          </label>
          <input
            type="email"
            value={contact.email}
            onChange={(e) =>
              onChange({ contact: { ...contact, email: e.target.value } }, 150)
            }
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            Teléfono
          </label>
          <input
            type="text"
            value={contact.phone}
            onChange={(e) =>
              onChange({ contact: { ...contact, phone: e.target.value } }, 150)
            }
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
          Ubicación
        </label>
        <input
          type="text"
          value={contact.location}
          onChange={(e) =>
            onChange({ contact: { ...contact, location: e.target.value } }, 150)
          }
          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            GitHub
          </label>
          <input
            type="text"
            value={contact.github || ""}
            placeholder="github.com/usuario"
            onChange={(e) =>
              onChange({ contact: { ...contact, github: e.target.value || null } }, 150)
            }
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 text-[11px]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            LinkedIn
          </label>
          <input
            type="text"
            value={contact.linkedin || ""}
            placeholder="linkedin.com/in/usuario"
            onChange={(e) =>
              onChange({ contact: { ...contact, linkedin: e.target.value || null } }, 150)
            }
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 text-[11px]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            Web
          </label>
          <input
            type="text"
            value={contact.website || ""}
            placeholder="portfolio.dev"
            onChange={(e) =>
              onChange({ contact: { ...contact, website: e.target.value || null } }, 150)
            }
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 text-[11px]"
          />
        </div>
      </div>
    </div>
  );
}
