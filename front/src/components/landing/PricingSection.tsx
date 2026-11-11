import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { PRICING_TIERS } from "@/lib/pricing";

export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="relative isolate overflow-hidden border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-24 sm:px-6 sm:py-32"
    >
      <div aria-hidden="true" className="story-glow -right-48 -top-36 opacity-40" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <ScrollReveal direction="up">
          <div className="mb-12 flex flex-col gap-6 border-b border-[var(--border-hairline)] pb-8 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">04 / Inversión</p>
              <h2 id="pricing-title" className="mt-3 max-w-3xl font-display text-4xl font-medium tracking-[-0.05em] text-[var(--text-ivory)] sm:text-6xl">
                Empezá gratis. <span className="italic text-[var(--text-secondary)]">Pagá una vez.</span>
              </h2>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid items-stretch gap-4 md:grid-cols-3 md:gap-5">
          {PRICING_TIERS.map((tier, index) => (
            <ScrollReveal key={tier.id} direction="up" className="h-full">
              <article
                className={`group relative flex h-full flex-col overflow-hidden border p-6 transition duration-500 sm:p-7 ${
                    tier.isPopular
                    ? "border-[var(--accent)] bg-[var(--bg-surface-raised)] shadow-[0_28px_90px_-46px_rgba(225,163,74,0.45)] md:-translate-y-3"
                    : tier.id === "lifetime"
                    ? "border-[var(--green-border)] bg-[var(--green-subtle)]/20 hover:border-[var(--green-text)]"
                    : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-subtle)]"
                }`}
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-px origin-left transition-transform duration-700 group-hover:scale-x-100 ${
                    tier.isPopular ? "scale-x-100 bg-[var(--accent)]" : "scale-x-0 bg-[var(--green-text)] group-hover:scale-x-100"
                  }`}
                />
                <div className="mb-8 flex min-h-9 items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {`0${index + 1}`}
                  </p>
                  {tier.badge ? (
                    <span className={`border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${tier.isPopular ? "border-[var(--accent)]/40 text-[var(--accent)]" : "border-[var(--green-border)] text-[var(--green-text)]"}`}>
                      {tier.badge}
                    </span>
                  ) : null}
                </div>

                <div>
                  <h3 className="font-display text-2xl text-[var(--text-ivory)]">{tier.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{tier.tagline}</p>
                </div>

                <div className="mt-8 border-b border-[var(--border-hairline)] pb-6">
                  <p className={`font-display text-6xl leading-none tracking-[-0.06em] ${tier.isPopular ? "text-[var(--accent)]" : tier.id === "lifetime" ? "text-[var(--green-text)]" : "text-[var(--text-ivory)]"}`}>
                    {tier.price}
                  </p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    {tier.periodLabel}
                  </p>
                </div>

                <ul className="flex-1 space-y-3 py-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-snug text-[var(--text-secondary)]">
                      <Check aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${tier.isPopular ? "text-[var(--accent)]" : "text-[var(--green-text)]"}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.ctaHref}
                  className={`group/link flex min-h-12 items-center justify-between gap-4 border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    tier.isPopular
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)]"
                      : tier.id === "lifetime"
                      ? "border-[var(--green-border)] text-[var(--green-text)] hover:border-[var(--green-text)] hover:bg-[var(--green-subtle)]"
                      : "border-[var(--border-subtle)] text-[var(--text-ivory)] hover:border-[var(--green-border)] hover:text-[var(--green-text)]"
                  }`}
                >
                  {tier.ctaText}
                  <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                </Link>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
