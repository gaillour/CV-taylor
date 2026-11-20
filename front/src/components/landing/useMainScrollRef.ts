"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useMainScrollRef() {
  const scrollRef = useRef<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    scrollRef.current = document.getElementById("main-scroll");
  }, []);

  return scrollRef;
}
