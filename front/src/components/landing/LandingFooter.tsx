"use client";

import React from "react";
import Link from "next/link";
import { TailorScissors } from "./TailoringIcons";

export function LandingFooter() {
  return (
    <footer className="py-12 border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-xs text-[var(--text-muted)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded border border-[var(--border-hairline)] flex items-center justify-center text-[var(--accent)]">
            <TailorScissors size={14} strokeWidth={1.8} />
          </div>
          <span className="font-display text-[var(--text-primary)] font-bold tracking-widest text-xs">
            CV-TAILOR
          </span>
          <span className="text-[var(--text-muted)] font-mono text-[11px]">
            • Confección tipográfica en Typst sin alucinaciones.
          </span>
        </div>

        <div className="flex items-center gap-6 font-mono text-[11px] text-[var(--text-secondary)]">
          <Link href="/cvs" className="hover:text-[var(--text-primary)] transition-colors">
            App
          </Link>
          <a
            href="https://github.com/gaillour"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            GitHub
          </a>
          <span className="text-[var(--text-muted)]">Licencia FSL / Open Core</span>
        </div>

      </div>
    </footer>
  );
}
