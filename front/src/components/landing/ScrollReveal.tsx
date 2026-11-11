"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: "up" | "left" | "right" | "none";
}

export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  direction = "up",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scrollContainer = document.getElementById("main-scroll");

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: scrollContainer || null,
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getTransform = () => {
    if (isVisible) return "translate3d(0, 0, 0)";
    switch (direction) {
      case "up":
        return "translate3d(0, 32px, 0)";
      case "left":
        return "translate3d(36px, 0, 0)";
      case "right":
        return "translate3d(-36px, 0, 0)";
      case "none":
      default:
        return "translate3d(0, 0, 0)";
    }
  };

  return (
    <div
      ref={ref}
      style={{
        transform: getTransform(),
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? "blur(0px)" : "blur(2px)",
        transition: `transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, filter 0.8s ease ${delayMs}ms`,
      }}
      className={`scroll-reveal ${className}`}
    >
      {children}
    </div>
  );
}
