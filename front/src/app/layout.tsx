import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { TopNav } from "@/components/nav/TopNav";

export const metadata: Metadata = {
  title: "Taylor — Sastrería Determinista de CVs en Typst",
  description: "Cargá toda tu carrera una vez. Compilación tipográfica de 1 página estricta y adaptaciones IA para ingenieros.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,600;0,700;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-screen flex flex-col overflow-hidden font-body bg-[var(--bg-canvas)] text-[var(--text-primary)]">
        <Suspense fallback={<div className="h-14 shrink-0 bg-zinc-950/70 border-b border-zinc-800/80" />}>
          <TopNav />
        </Suspense>
        <main id="main-scroll" className="flex-1 min-h-0 flex flex-col overflow-y-auto scroll-smooth">{children}</main>
      </body>
    </html>
  );
}
