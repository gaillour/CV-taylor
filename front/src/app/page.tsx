"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSupabaseConfigLoaded, getStoredSession } from "@/lib/supabase";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { TheMirrorSection } from "@/components/landing/TheMirrorSection";
import { VersionTimelineSection } from "@/components/landing/VersionTimelineSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return Boolean(getStoredSession());
    }
    return false;
  });

  useEffect(() => {
    let active = true;

    if (isAuthenticated) {
      router.replace("/editor");
      return;
    }

    ensureSupabaseConfigLoaded().then((enabled) => {
      if (!active) return;
      if (enabled && getStoredSession()) {
        setIsAuthenticated(true);
        router.replace("/editor");
      }
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return <div className="min-h-screen bg-[var(--bg-canvas)]" />;
  }

  return (
    <div className="min-h-full flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <WorkflowSection />
        <TheMirrorSection />
        <VersionTimelineSection />
        <PricingSection />
      </main>
      <LandingFooter />
    </div>
  );
}
