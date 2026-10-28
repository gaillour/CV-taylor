"use client";

import React from "react";
import { ContactInfo } from "@/types/cv";
import { BufferedInput } from "./BufferedFields";

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
        <BufferedInput
          type="text"
          value={fullName}
          onCommit={(val) => onChange({ fullName: val }, 0)}
          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            Email
          </label>
          <BufferedInput
            type="email"
            value={contact.email}
            onCommit={(val) =>
              onChange({ contact: { ...contact, email: val } }, 0)
            }
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            Teléfono
          </label>
          <BufferedInput
            type="text"
            value={contact.phone}
            onCommit={(val) =>
              onChange({ contact: { ...contact, phone: val } }, 0)
            }
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
          Ubicación
        </label>
        <BufferedInput
          type="text"
          value={contact.location}
          onCommit={(val) =>
            onChange({ contact: { ...contact, location: val } }, 0)
          }
          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            GitHub
          </label>
          <BufferedInput
            type="text"
            value={contact.github || ""}
            placeholder="github.com/usuario"
            onCommit={(val) =>
              onChange({ contact: { ...contact, github: val || null } }, 0)
            }
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 text-[11px]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            LinkedIn
          </label>
          <BufferedInput
            type="text"
            value={contact.linkedin || ""}
            placeholder="linkedin.com/in/usuario"
            onCommit={(val) =>
              onChange({ contact: { ...contact, linkedin: val || null } }, 0)
            }
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 text-[11px]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            Web
          </label>
          <BufferedInput
            type="text"
            value={contact.website || ""}
            placeholder="portfolio.dev"
            onCommit={(val) =>
              onChange({ contact: { ...contact, website: val || null } }, 0)
            }
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 text-[11px]"
          />
        </div>
      </div>
    </div>
  );
}
