"use client";

import React from "react";
import { Check, Sparkles, X } from "lucide-react";
import { PRICING_TIERS } from "@/lib/pricing";
import { usePaywallStore } from "@/store/usePaywallStore";
import { toast } from "@/store/useToastStore";

export function PaywallModal() {
  const { isOpen, reason, closePaywall } = usePaywallStore();

  if (!isOpen) return null;

  const handleCta = (tierId: string) => {
    if (tierId === "free") {
      closePaywall();
      return;
    }
    // El checkout se integra en fases posteriores
    toast.info("Redirigiendo a pasarela de pago segura...");
    closePaywall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-canvas/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-surface border border-hairline rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-subtle border border-accent-border flex items-center justify-center text-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-text-ivory">
                {reason ? "Límite de adaptaciones alcanzado" : "Planes y Tarifas"}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {reason
                  ? reason
                  : "La edición y exportación PDF son siempre 100% gratuitas. Pagá solo si querés adaptaciones IA ilimitadas."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePaywall}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banner de cuota si se disparó por error de cuota */}
        {reason && (
          <div className="bg-accent-subtle border-b border-accent-border px-6 py-2.5 flex items-center gap-2 text-xs text-accent">
            <span className="font-mono text-xs">💡</span>
            <span>
              Tus 2 adaptaciones IA de prueba gratuitas fueron utilizadas. Podés seguir editando y descargando tus PDFs gratis, u obtener el Pase para adaptaciones sin límite.
            </span>
          </div>
        )}

        {/* Grilla de Tiers consumiendo PRICING_TIERS (SSOT) */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {PRICING_TIERS.map((tier) => {
              const isPopular = tier.isPopular;
              return (
                <div
                  key={tier.id}
                  className={`p-6 rounded-xl flex flex-col justify-between relative transition-colors ${
                    isPopular
                      ? "bg-surface-raised border-2 border-accent shadow-md"
                      : "bg-canvas border border-hairline hover:border-hairline-raised"
                  }`}
                >
                  {tier.badge && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wider ${
                        isPopular
                          ? "bg-accent text-accent-contrast"
                          : "bg-surface-raised border border-hairline text-text-secondary"
                      }`}
                    >
                      {tier.badge}
                    </div>
                  )}

                  <div>
                    <h4 className="font-display text-lg text-text-primary font-bold mb-1">
                      {tier.name}
                    </h4>
                    <p className="text-xs text-text-secondary mb-4 min-h-[36px] leading-relaxed">
                      {tier.tagline}
                    </p>

                    <div className="mb-4 pb-4 border-b border-hairline">
                      <span className="text-3xl font-mono font-bold text-text-primary">
                        {tier.price}
                      </span>
                      <span className="text-[11px] text-text-muted block mt-1 font-mono">
                        {tier.periodLabel}
                      </span>
                    </div>

                    <ul className="text-xs text-text-secondary space-y-2.5 mb-6">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-green-text shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCta(tier.id)}
                    className={`w-full py-2.5 rounded-lg text-xs tracking-wider transition-all font-medium cursor-pointer ${
                      isPopular
                        ? "btn-accent shadow-xs"
                        : tier.id === "free"
                        ? "btn-secondary text-text-muted hover:text-text-primary"
                        : "btn-secondary text-text-primary"
                    }`}
                  >
                    {tier.id === "free" ? "Continuar Gratis" : tier.ctaText}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-hairline bg-surface flex items-center justify-between text-[11px] text-text-muted font-mono">
          <span>Pago único sin suscripción mensual ni letras chicas</span>
          <span>Soporte: soporte@cv-tailor.app</span>
        </div>
      </div>
    </div>
  );
}
