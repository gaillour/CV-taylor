"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { animate, motion, useInView } from "motion/react";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SpotlightCard } from "@/components/landing/motion/SpotlightCard";
import { TextMaskReveal } from "@/components/landing/motion/TextMaskReveal";
import { useMainScrollRef } from "@/components/landing/useMainScrollRef";
import { PRICING_TIERS } from "@/lib/pricing";

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;

function AnimatedPrice({ price, className }: { price: string; className: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const scrollRef = useMainScrollRef();
  const isInView = useInView(ref, { once: false, amount: 0.4, root: scrollRef });
  const match = price.match(/^([^0-9]*)(\d+)(.*)$/);
  const target = match ? Number(match[2]) : null;
  const [display, setDisplay] = useState(target !== null ? 0 : null);

  useEffect(() => {
    if (!isInView || target === null || target === 0) return;
    const controls = animate(0, target, {
      duration: 0.9,
      ease: EDITORIAL_EASE,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [isInView, target]);

  const shown = !isInView && target !== null && target !== 0 ? 0 : display;
  const formatted =
    match && shown !== null ? `${match[1]}${shown}${match[3]}` : price;

  return (
    <p ref={ref} className={className}>
      {formatted}
    </p>
  );
}

export function PricingSection() {
  const scrollRef = useMainScrollRef();

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
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">
                05 / Inversión
              </p>
              <h2
                id="pricing-title"
                className="mt-3 max-w-3xl font-display text-4xl font-medium tracking-[-0.05em] text-[var(--text-ivory)] sm:text-6xl"
              >
                <TextMaskReveal>Empezá gratis.</TextMaskReveal>{" "}
                <span className="italic text-[var(--text-secondary)]">
                  <TextMaskReveal delay={0.08}>Pagá una vez.</TextMaskReveal>
                </span>
              </h2>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid items-stretch gap-4 md:grid-cols-3 md:gap-5">
          {PRICING_TIERS.map((tier, index) => {
            const spotlightTone = tier.isPopular
              ? "accent"
              : tier.id === "lifetime"
              ? "green"
              : "neutral";

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: false, amount: 0.15, root: scrollRef }}
                transition={{
                  duration: 0.65,
                  delay: index * 0.08,
                  ease: EDITORIAL_EASE,
                }}
                whileHover={{ y: -4 }}
                className="h-full"
              >
                <SpotlightCard
                  tone={spotlightTone}
                  className={`group relative flex h-full flex-col border transition-colors duration-500 ${
                    tier.isPopular
                      ? "border-[var(--accent)] bg-[var(--bg-surface-raised)] shadow-[0_28px_90px_-46px_rgba(225,163,74,0.45)] md:-translate-y-3"
                      : tier.id === "lifetime"
                      ? "border-[var(--green-border)] bg-[var(--green-subtle)]/20 hover:border-[var(--green-text)]"
                      : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-subtle)]"
                  }`}
                >
                  <article className="relative flex h-full flex-col p-6 sm:p-7">
                    <div
                      aria-hidden="true"
                      className={`absolute inset-x-0 top-0 h-px origin-left transition-transform duration-700 group-hover:scale-x-100 ${
                        tier.isPopular
                          ? "scale-x-100 bg-gradient-to-r from-[var(--accent)] via-[#fff8e7] to-[var(--accent)]"
                          : "scale-x-0 bg-[var(--green-text)] group-hover:scale-x-100"
                      }`}
                    />
                    <div className="mb-8 flex min-h-9 items-center justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {`0${index + 1}`}
                      </p>
                      {tier.badge ? (
                        <span
                          className={`border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${
                            tier.isPopular
                              ? "border-[var(--accent)]/40 text-[var(--accent)]"
                              : "border-[var(--green-border)] text-[var(--green-text)]"
                          }`}
                        >
                          {tier.badge}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="font-display text-2xl text-[var(--text-ivory)]">{tier.name}</h3>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{tier.tagline}</p>
                    </div>

                    <div className="mt-8 border-b border-[var(--border-hairline)] pb-6">
                      <AnimatedPrice
                        price={tier.price}
                        className={`font-display text-6xl leading-none tracking-[-0.06em] ${
                          tier.isPopular
                            ? "text-[var(--accent)]"
                            : tier.id === "lifetime"
                            ? "text-[var(--green-text)]"
                            : "text-[var(--text-ivory)]"
                        }`}
                      />
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        {tier.periodLabel}
                      </p>
                    </div>

                    <ul className="flex-1 space-y-3 py-6">
                      {tier.features.map((feature, fIdx) => (
                        <motion.li
                          key={feature}
                          initial={{ opacity: 0, x: -8 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: false, amount: 0.25, root: scrollRef }}
                          transition={{
                            duration: 0.4,
                            delay: 0.15 + fIdx * 0.07,
                            ease: EDITORIAL_EASE,
                          }}
                          className="flex items-start gap-3 text-sm leading-snug text-[var(--text-secondary)]"
                        >
                          <Check
                            aria-hidden="true"
                            className={`mt-0.5 size-4 shrink-0 ${
                              tier.isPopular ? "text-[var(--accent)]" : "text-[var(--green-text)]"
                            }`}
                          />
                          <span>{feature}</span>
                        </motion.li>
                      ))}
                    </ul>

                    <motion.div whileTap={{ scale: 0.985 }}>
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
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                        />
                      </Link>
                    </motion.div>
                  </article>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
