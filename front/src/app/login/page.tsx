"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Code2,
  Globe,
  Sparkles,
} from "lucide-react";
import {
  consumeOAuthHashIfPresent,
  ensureSupabaseConfigLoaded,
  getStoredSession,
  isSupabaseConfigured,
  signInWithOAuth,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/supabase";
import { setPendingAction, PendingActionType } from "@/lib/draft";
import { TailorScissors } from "@/components/landing/TailoringIcons";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextParam = searchParams.get("next");
  const actionParam = searchParams.get("action");
  const targetPath = nextParam && nextParam.startsWith("/") ? nextParam : "/editor";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [configured, setConfigured] = useState(() => isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Registrar acción pendiente si viene en los query params
  useEffect(() => {
    if (actionParam && (actionParam === "save" || actionParam === "tailor")) {
      setPendingAction({
        action: actionParam as PendingActionType,
        createdAt: new Date().toISOString(),
      });
    }
  }, [actionParam]);

  // Verificar sesión existente o hash OAuth al cargar
  useEffect(() => {
    let active = true;

    ensureSupabaseConfigLoaded().then(async (isEnabled) => {
      if (!active) return;
      setConfigured(isEnabled);
      setCheckingConfig(false);
      if (!isEnabled) return;

      const hashSession = await consumeOAuthHashIfPresent();
      if (!active) return;
      const existing = hashSession || getStoredSession();
      if (existing) {
        router.replace(targetPath);
      }
    });

    return () => {
      active = false;
    };
  }, [router, targetPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
        router.replace(targetPath);
      } else {
        const result = await signUpWithPassword(email.trim(), password);
        if (result.session) {
          router.replace(targetPath);
        } else if (result.confirmationRequired) {
          setInfoMessage(
            "Cuenta creada. Revisá tu casilla de correo para confirmar el email antes de iniciar sesión."
          );
          setMode("signin");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider: "github" | "google") => {
    const currentSearch = window.location.search;
    const redirectUri = `${window.location.origin}/login${currentSearch}`;
    signInWithOAuth(provider, redirectUri);
  };

  if (checkingConfig) {
    return (
      <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-muted)] text-xs font-mono gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
        <span>Preparando atelier...</span>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--bg-canvas)] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-8 text-center space-y-5 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] mx-auto">
            <TailorScissors size={20} strokeWidth={1.8} />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg text-[var(--text-ivory)] font-medium">
              Modo Local Activo
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              No se detectaron credenciales de Supabase Cloud. Podés editar, previsualizar y descargar tu CV con almacenamiento local sin límites.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.replace(targetPath)}
            className="btn-accent w-full py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider font-medium transition-colors cursor-pointer"
          >
            Continuar al Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--bg-canvas)] p-4 sm:p-6 relative overflow-hidden">
      {/* Luz ambiental sutil */}
      <div className="ambient-glow top-0 left-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-7 sm:p-9 shadow-2xl relative z-10 space-y-6">
        {/* Cabecera con Logo Atelier */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-md border border-[var(--accent-border)] bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)] group-hover:border-[var(--accent)] transition-all shadow-sm">
              <TailorScissors size={16} strokeWidth={1.8} />
            </div>
            <span className="text-sm font-semibold tracking-[0.16em] text-[var(--text-primary)] font-mono">
              CV-TAILOR
            </span>
          </Link>

          <div>
            <h1 className="font-display text-2xl text-[var(--text-ivory)] font-bold">
              {mode === "signin" ? "Ingresá a tu Cuenta" : "Creá tu Cuenta"}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {mode === "signin"
                ? "Sincronizá tus CVs y adaptá perfiles con IA"
                : "Guardá tus versiones en la nube y desbloqueá adaptaciones"}
            </p>
          </div>
        </div>

        {/* Banner contextual de acción pendiente */}
        {actionParam && (
          <div className="rounded-xl border border-[var(--accent-border)] bg-[var(--accent-subtle)] p-3 text-xs text-[var(--accent)] flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="leading-snug">
              {actionParam === "save"
                ? "Iniciá sesión para guardar tu CV en la nube y conservarlo para siempre."
                : actionParam === "tailor"
                ? "Iniciá sesión para adaptar tu CV a la oferta laboral con IA."
                : "Iniciá sesión para continuar con tu acción pendiente."}
            </span>
          </div>
        )}

        {/* Selector de Modo (Tabs estilo sastre) */}
        <div className="grid grid-cols-2 rounded-xl bg-[var(--bg-canvas)] p-1 border border-[var(--border-hairline)] text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setInfoMessage(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer font-medium ${
              mode === "signin"
                ? "bg-[var(--bg-surface-raised)] text-[var(--text-ivory)] border border-[var(--border-hairline)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setInfoMessage(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer font-medium ${
              mode === "signup"
                ? "bg-[var(--bg-surface-raised)] text-[var(--text-ivory)] border border-[var(--border-hairline)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {/* Mensajes de Error / Info */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-subtle)] p-3 text-xs text-[var(--danger)] font-mono">
            <AlertCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--green-border)] bg-[var(--green-subtle)] p-3 text-xs text-[var(--green-text)] font-mono">
            <CheckCircle2 className="w-4 h-4 text-[var(--green-text)] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/70 pl-9 pr-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] font-mono transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/70 pl-9 pr-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] font-mono transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-contrast)]" />
            ) : (
              <>
                <span>{mode === "signin" ? "Ingresar al Atelier" : "Comenzar Ahora"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Separador */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-[var(--border-hairline)] w-full" />
          <span className="bg-[var(--bg-surface)] px-3 text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
            o continuá con
          </span>
          <div className="border-t border-[var(--border-hairline)] w-full" />
        </div>

        {/* Botones Sociales (OAuth) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleOAuthLogin("github")}
            className="btn-secondary flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-mono font-medium transition-colors cursor-pointer border border-[var(--border-hairline)] hover:border-[var(--border-subtle)]"
          >
            <Code2 className="w-4 h-4 text-[var(--text-muted)]" />
            GitHub
          </button>
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            className="btn-secondary flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-mono font-medium transition-colors cursor-pointer border border-[var(--border-hairline)] hover:border-[var(--border-subtle)]"
          >
            <Globe className="w-4 h-4 text-[var(--text-muted)]" />
            Google
          </button>
        </div>

        {/* Footer y enlace de regreso */}
        <div className="pt-2 border-t border-[var(--border-hairline)] text-center space-y-2">
          <p className="text-[11px] text-[var(--text-muted)] font-mono">
            Descargas PDF y plantillas siempre gratuitas • Sin tarjeta requerida
          </p>
          <div>
            <Link
              href={targetPath}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors inline-block font-sans"
            >
              ← Continuar en el editor sin cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-muted)] text-xs font-mono gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
          <span>Cargando taller...</span>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
