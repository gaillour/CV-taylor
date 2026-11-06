import React from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { TheMirrorSection } from "@/components/landing/TheMirrorSection";
import { VersionTimelineSection } from "@/components/landing/VersionTimelineSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
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
