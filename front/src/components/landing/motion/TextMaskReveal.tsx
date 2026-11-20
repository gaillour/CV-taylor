"use client";

import React, { useRef } from "react";
import { motion, useInView } from "motion/react";
import { useMainScrollRef } from "../useMainScrollRef";

interface TextMaskRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
}

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;

export function TextMaskReveal({
  children,
  className = "",
  delay = 0,
  inView = true,
}: TextMaskRevealProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const scrollRef = useMainScrollRef();
  const isInView = useInView(containerRef, { once: false, amount: 0.15, root: scrollRef });
  const shouldAnimate = inView ? isInView : true;

  return (
    <span
      ref={containerRef}
      className={`inline-block overflow-hidden align-bottom pb-[0.16em] -mb-[0.16em] ${className}`}
    >
      <motion.span
        className="inline-block"
        initial={{ y: "105%", opacity: 0 }}
        animate={shouldAnimate ? { y: "0%", opacity: 1 } : { y: "105%", opacity: 0 }}
        transition={{
          duration: 0.72,
          delay,
          ease: EDITORIAL_EASE,
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}
