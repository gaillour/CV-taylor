"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
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
        router.replace("/");
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
        router.replace("/");
      } else {
        const result = await signUpWithPassword(email.trim(), password);
        if (result.session) {
          router.replace("/");
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
      <div className="flex-1 flex items-center justify-center bg-black text-zinc-500 text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Verificando conexión Cloud...
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-zinc-100">Modo Local Activo</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            No se detectaron credenciales de Supabase (
            <code className="text-zinc-300">SUPABASE_URL</code> /{" "}
            <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_URL</code>). La aplicación
            está operando con almacenamiento local en disco sin requerir autenticación.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="w-full py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-medium text-xs transition"
          >
            Ir a la Galería de CVs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-black p-6 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-7 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-100">CV Tailor Cloud</h1>
            <p className="text-xs text-zinc-400">
              {mode === "signin"
                ? "Iniciá sesión para sincronizar tu perfil y CVs"
                : "Creá tu cuenta para guardar tu Perfil Maestro"}
            </p>
          </div>
        </div>

        {/* Selector de modo */}
        <div className="grid grid-cols-2 rounded-lg bg-zinc-900 p-1 border border-zinc-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setInfoMessage(null);
            }}
            className={`py-1.5 rounded-md transition ${
              mode === "signin"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setInfoMessage(null);
            }}
            className={`py-1.5 rounded-md transition ${
              mode === "signup"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold py-2.5 text-xs transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === "signin" ? "Ingresar" : "Registrarme"}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-zinc-800 w-full" />
          <span className="bg-zinc-950 px-3 text-[11px] text-zinc-500 uppercase tracking-wider">
            O continuar con
          </span>
          <div className="border-t border-zinc-800 w-full" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => signInWithOAuth("github")}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 py-2 text-xs font-medium text-zinc-200 transition"
          >
            <Code2 className="w-3.5 h-3.5" />
            GitHub
          </button>
          <button
            type="button"
            onClick={() => signInWithOAuth("google")}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 py-2 text-xs font-medium text-zinc-200 transition"
          >
            <Globe className="w-3.5 h-3.5" />
            Google
          </button>
        </div>
      </div>
    </div>
  );
}
