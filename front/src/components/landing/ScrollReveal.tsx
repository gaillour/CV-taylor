"use client";

import React from "react";
import { motion } from "motion/react";
import { useMainScrollRef } from "./useMainScrollRef";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: "up" | "left" | "right" | "none";
}

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;

export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  direction = "up",
}: ScrollRevealProps) {
  const scrollRef = useMainScrollRef();
  const initialOffset =
    direction === "up"
      ? { y: 24, x: 0 }
      : direction === "left"
      ? { x: 28, y: 0 }
      : direction === "right"
      ? { x: -28, y: 0 }
      : { x: 0, y: 0 };

  return (
    <motion.div
      initial={{
        opacity: 0,
        filter: "blur(5px)",
        ...initialOffset,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        filter: "blur(0px)",
      }}
      viewport={{
        once: false,
        amount: 0.15,
        root: scrollRef,
      }}
      transition={{
        duration: 0.7,
        delay: delayMs / 1000,
        ease: EDITORIAL_EASE,
      }}
      className={`scroll-reveal ${className}`}
    >
      {children}
    </motion.div>
  );
}
