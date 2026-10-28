import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { TopNav } from "@/components/nav/TopNav";

export const metadata: Metadata = {
  title: "CV Tailor — Deterministic 1-Page Typst Tailoring",
  description: "CV Tailor interactive real-time preview and tailoring MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased dark">
      <body className="h-screen flex flex-col overflow-hidden font-sans bg-black text-zinc-100">
        <Suspense fallback={<div className="h-14 shrink-0 bg-zinc-950/70 border-b border-zinc-800/80" />}>
          <TopNav />
        </Suspense>
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </body>
    </html>
  );
}

