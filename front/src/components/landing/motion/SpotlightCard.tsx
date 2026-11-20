"use client";

import React, { useCallback } from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";

type SpotlightTone = "accent" | "green" | "neutral";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  tone?: SpotlightTone;
}

const TONE_COLORS: Record<SpotlightTone, string> = {
  accent: "rgba(225, 163, 74, 0.14)",
  green: "rgba(148, 201, 169, 0.14)",
  neutral: "rgba(246, 239, 228, 0.08)",
};

export function SpotlightCard({
  children,
  className = "",
  tone = "accent",
}: SpotlightCardProps) {
  const mouseX = useMotionValue(-999);
  const mouseY = useMotionValue(-999);
  const opacity = useMotionValue(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
      opacity.set(1);
    },
    [mouseX, mouseY, opacity]
  );

  const handleMouseLeave = useCallback(() => {
    opacity.set(0);
  }, [opacity]);

  const background = useMotionTemplate`radial-gradient(380px circle at ${mouseX}px ${mouseY}px, ${TONE_COLORS[tone]}, transparent 75%)`;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{ background, opacity }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
