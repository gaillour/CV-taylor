"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PricingTier } from "./types";
import { ScrollReveal } from "./ScrollReveal";

const tiers: PricingTier[] = [
  {
    id: "free",
    name: "Comunidad / Self-Host",
    tagline: "Para quienes valoran control local, privacidad o quieren auditar el código.",
    price: "$0",
    periodLabel: "Gratis para siempre",
    ctaText: "Usar Gratis",
    ctaHref: "/cvs",
    features: [
      "Perfil Maestro completo",
      "Compilaciones Typst ilimitadas",
      "Descargas de PDF vectorial",
      "2 adaptaciones de prueba con IA",
      "Código auditable (Open Core)",
    ],
  },
  {
    id: "pass",
    name: "Pase Búsqueda Activa",
    badge: "Más Conveniente",
    tagline: "Para postularte activamente durante tus meses de búsqueda laboral intensa.",
    price: "$9",
    periodLabel: "USD • Pago único por 90 días",
    isPopular: true,
    ctaText: "Obtener Pase Activo",
    ctaHref: "/cvs",
    features: [
      "Todo lo incluido en Comunidad",
      "Adaptaciones IA ilimitadas",
      "Comparador de keywords vs oferta",
      "Historial de snapshots infinito",
      "Sin cobros automáticos recurrentes",
    ],
  },
  {
    id: "lifetime",
    name: "Early Adopter",
    badge: "Cupo Limitado",
    tagline: "Para fundadores, mentores y desarrolladores que quieren acceso vitalicio.",
    price: "$29",
    periodLabel: "USD • Acceso vitalicio de por vida",
    ctaText: "Acceso Lifetime",
    ctaHref: "/cvs",
    features: [
      "Acceso de por vida a cvtailor.dev",
      "Adaptaciones ilimitadas para siempre",
      "Todas las futuras plantillas Typst",
      "Soporte prioritario y roadmap directo",
      "Insignia de patrocinador inicial",
    ],
  },
];

export function PricingSection() {
  return (
    <section id="tarifas" className="py-20 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabecera */}
        <ScrollReveal direction="up">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-display italic text-lg sm:text-xl text-[var(--accent)] block mb-1">
              Corte & Confección
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-[var(--text-primary)] font-bold">
              Tarifas Justas. Sin Suscripciones Ocultas.
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-3">
              Detestamos las suscripciones semanales que se olvidan activadas. Cobros transparentes de pago único cuando los necesitás.
            </p>
          </div>
        </ScrollReveal>

        {/* Tarjetas de Precios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier, idx) => {
            const isPopular = tier.isPopular;
            return (
              <ScrollReveal key={tier.id} delayMs={idx * 120} direction="up" className="h-full">
                <div
                  className={`h-full p-6 sm:p-8 rounded-lg flex flex-col justify-between relative transition-colors ${
                    isPopular
                      ? "bg-[var(--bg-surface-raised)] border-2 border-[var(--accent)] shadow-lg"
                      : "bg-[var(--bg-canvas)] border border-[var(--border-hairline)] hover:border-[var(--border-subtle)]"
                  }`}
                >
                  {tier.badge && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                        isPopular
                          ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                          : "bg-[var(--bg-surface-raised)] border border-[var(--border-hairline)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {tier.badge}
                    </div>
                  )}

                  <div>
                    <h3 className="font-display text-lg text-[var(--text-primary)] font-bold mb-1">
                      {tier.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mb-6 min-h-[32px]">
                      {tier.tagline}
                    </p>

                    <div className="mb-6 pb-6 border-b border-[var(--border-hairline)]">
                      <span className="text-3xl font-display font-bold text-[var(--text-primary)] font-mono">
                        {tier.price}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] block mt-1 font-mono">
                        {tier.periodLabel}
                      </span>
                    </div>

                    <ul className="text-xs text-[var(--text-secondary)] space-y-3 mb-8">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={tier.ctaHref}
                    className={`w-full py-2.5 rounded text-xs uppercase tracking-wider text-center transition-all ${
                      isPopular
                        ? "btn-accent shadow-sm"
                        : "btn-secondary"
                    }`}
                  >
                    {tier.ctaText}
                  </Link>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}
