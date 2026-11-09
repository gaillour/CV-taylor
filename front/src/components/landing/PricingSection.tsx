"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { BastingStitchDivider } from "./TailoringIcons";
import { PRICING_TIERS as tiers } from "@/lib/pricing";

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabecera */}
        <ScrollReveal direction="up">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="font-display italic text-xl sm:text-2xl text-[var(--accent)] block mb-2">
              Tarifas Claras
            </span>
            <h2 className="font-display text-3xl sm:text-5xl text-[var(--text-primary)] font-bold tracking-tight">
              Sin suscripciones. Pagás una sola vez.
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-4 max-w-xl mx-auto">
              Nada de cobros automáticos que te olvidás de cancelar. Precios de pago único para tus meses de búsqueda laboral.
            </p>
          </div>
        </ScrollReveal>

        {/* Divisor de costura sastre */}
        <BastingStitchDivider className="max-w-xs mx-auto mb-14" />

        {/* Tarjetas de Precios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier, idx) => {
            const isPopular = tier.isPopular;
            return (
              <ScrollReveal key={tier.id} delayMs={idx * 120} direction="up" className="h-full">
                <div
                  className={`h-full p-8 sm:p-10 rounded-xl flex flex-col justify-between relative transition-colors shadow-xs ${
                    isPopular
                      ? "bg-[var(--bg-surface-raised)] border-2 border-[var(--accent)] shadow-lg"
                      : "bg-[var(--bg-canvas)] border border-[var(--border-hairline)] hover:border-[var(--border-subtle)]"
                  }`}
                >
                  {tier.badge && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                        isPopular
                          ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                          : "bg-[var(--bg-surface-raised)] border border-[var(--border-hairline)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {tier.badge}
                    </div>
                  )}

                  <div>
                    <h3 className="font-display text-xl sm:text-2xl text-[var(--text-primary)] font-bold mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-6 min-h-[40px] leading-relaxed">
                      {tier.tagline}
                    </p>

                    <div className="mb-6 pb-6 border-b border-[var(--border-hairline)]">
                      <span className="text-4xl font-mono font-bold text-[var(--text-primary)]">
                        {tier.price}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] block mt-1 font-mono">
                        {tier.periodLabel}
                      </span>
                    </div>

                    <ul className="text-sm text-[var(--text-secondary)] space-y-3.5 mb-8">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-[var(--green-text)] shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={tier.ctaHref}
                    className={`w-full py-3 rounded text-xs uppercase tracking-wider text-center transition-all font-medium ${
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
