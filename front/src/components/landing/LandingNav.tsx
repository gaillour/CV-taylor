"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TailorScissors } from "./TailoringIcons";

export function LandingNav() {
  const [isVisible, setIsVisible] = React.useState(true);
  const lastScrollY = React.useRef(0);

  React.useEffect(() => {
    const scrollContainer = document.getElementById("main-scroll");
    const target = scrollContainer || window;

    const onScroll = () => {
      let current = 0;
      if (scrollContainer) {
        current = scrollContainer.scrollTop;
      } else {
        current = window.scrollY;
      }

      // Auto-hide al scrollear hacia abajo, reaparece suave al subir
      const diff = current - lastScrollY.current;
      if (current > 60 && diff > 4) {
        setIsVisible(false);
      } else if (diff < -4 || current <= 60) {
        setIsVisible(true);
      }
      lastScrollY.current = current;
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => target.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.hash = id;
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md bg-[var(--bg-canvas)]/85 border-b border-[var(--border-hairline)] transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Monograma & Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md border border-[var(--accent-border)] bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)] transition-all duration-200 group-hover:border-[var(--accent)] shadow-sm">
            <TailorScissors size={15} strokeWidth={1.8} />
          </div>
          <span className="text-sm font-semibold tracking-[0.16em] text-[var(--text-primary)] font-mono">
            CV-TAILOR
          </span>
        </Link>

        {/* Enlaces de navegación */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wider uppercase text-[var(--text-secondary)]">
          <a
            href="#metodo"
            onClick={(e) => scrollToSection(e, "metodo")}
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            Método
          </a>
          <a
            href="#the-mirror"
            onClick={(e) => scrollToSection(e, "the-mirror")}
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            The Mirror
          </a>
          <a
            href="#versiones"
            onClick={(e) => scrollToSection(e, "versiones")}
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            Versiones
          </a>
          <a
            href="#pricing"
            onClick={(e) => scrollToSection(e, "pricing")}
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            Pricing
          </a>
        </nav>

        {/* Acciones principales */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/gaillour"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-subtle)] transition-colors"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="font-mono text-[11px]">GitHub</span>
          </a>

          <Link
            href="/cvs"
            className="btn-accent inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs uppercase tracking-wider shadow-sm"
          >
            <span>Abrir Editor</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </header>
  );
}
