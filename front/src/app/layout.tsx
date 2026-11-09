import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppSidebar } from "@/components/nav/AppSidebar";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { UnloadGuard } from "@/components/common/UnloadGuard";
import { PaywallModal } from "@/components/paywall/PaywallModal";

export const metadata: Metadata = {
  title: "CV-Tailor — Tu CV adaptado a cada oferta en 1 página A4",
  description: "Cargá tu experiencia una sola vez y generá currículums adaptados a cada oferta laboral en exactamente 1 página A4.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
  },
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
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-screen flex overflow-hidden font-body bg-[var(--bg-canvas)] text-[var(--text-primary)]">
        <Suspense fallback={<div className="w-0 md:w-60 shrink-0 bg-surface border-r border-hairline" />}>
          <AppSidebar />
        </Suspense>
        <main id="main-scroll" className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto scroll-smooth">
          {children}
        </main>
        <ConfirmModal />
        <ToastContainer />
        <UnloadGuard />
        <PaywallModal />
      </body>
    </html>
  );
}
