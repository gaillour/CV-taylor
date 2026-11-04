"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Code2,
  Globe,
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

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [configured, setConfigured] = useState(() => isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

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
        router.replace("/cvs");
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
        router.replace("/cvs");
      } else {
        const result = await signUpWithPassword(email.trim(), password);
        if (result.session) {
          router.replace("/cvs");
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

  if (checkingConfig) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#09090b] text-zinc-500 text-xs font-mono gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        Verificando configuración...
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#09090b] p-6">
        <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-zinc-950 p-6 text-center space-y-4">
          <div className="w-9 h-9 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300 mx-auto">
            <FileText className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-semibold text-zinc-100">Modo local activo</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            No se detectaron credenciales de Supabase. La aplicación está operando con almacenamiento local en disco.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/cvs")}
            className="w-full py-2 px-4 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition cursor-pointer"
          >
            Ir a la galería de CVs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-[#09090b] p-6 overflow-y-auto">
      <div className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-zinc-950 p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-semibold text-zinc-100">cv-tailor cloud</h1>
            <p className="text-[11px] text-zinc-400">
              {mode === "signin"
                ? "Iniciá sesión para sincronizar tus CVs"
                : "Creá tu cuenta para respaldar tu perfil"}
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 rounded-md bg-zinc-900 p-0.5 border border-white/[0.08] text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setInfoMessage(null);
            }}
            className={`py-1 rounded transition cursor-pointer ${
              mode === "signin"
                ? "bg-zinc-800 text-zinc-100 border border-white/[0.06]"
                : "text-zinc-400 hover:text-zinc-200"
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
            className={`py-1 rounded transition cursor-pointer ${
              mode === "signup"
                ? "bg-zinc-800 text-zinc-100 border border-white/[0.06]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-950/30 p-2.5 text-xs text-rose-300 font-mono text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="flex items-start gap-2 rounded-md border border-white/[0.08] bg-zinc-900 p-2.5 text-xs text-zinc-300 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-400">Email</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-md border border-white/[0.08] bg-zinc-900/60 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-400">Contraseña</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-white/[0.08] bg-zinc-900/60 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 rounded-md bg-zinc-100 hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-950 font-medium py-2 text-xs transition cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
            ) : (
              <>
                <span>{mode === "signin" ? "Ingresar" : "Registrarme"}</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/[0.06] w-full" />
          <span className="bg-zinc-950 px-2 text-[10px] text-zinc-500 font-mono uppercase">
            o
          </span>
          <div className="border-t border-white/[0.06] w-full" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => signInWithOAuth("github")}
            className="flex items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800 py-1.5 text-xs font-medium text-zinc-300 transition cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-zinc-400" />
            GitHub
          </button>
          <button
            type="button"
            onClick={() => signInWithOAuth("google")}
            className="flex items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800 py-1.5 text-xs font-medium text-zinc-300 transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
            Google
          </button>
        </div>
      </div>
    </div>
  );
}
