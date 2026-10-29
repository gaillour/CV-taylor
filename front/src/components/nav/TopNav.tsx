"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState, useSyncExternalStore } from "react";
import {
  CloudUpload,
  FileStack,
  Loader2,
  LogIn,
  LogOut,
  PenSquare,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useCvStore } from "@/store/useCvStore";
import { useProfileStore } from "@/store/useProfileStore";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import {
  ensureSupabaseConfigLoaded,
  getStoredSession,
  isSupabaseConfigured,
  onAuthStateChange,
  signOut,
} from "@/lib/supabase";

const tabBase =
  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition";
const tabActive = "bg-zinc-800 text-zinc-100 shadow-sm";
const tabIdle = "text-zinc-400 hover:text-zinc-200";
const tabDisabled = "text-zinc-600 cursor-not-allowed";

const CONFIRM_LEAVE_PROFILE =
  "Tenés cambios sin guardar en tu Perfil Maestro. ¿Seguro que querés salir sin guardar?";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const hasDraft = useCvStore((s) => s.renderModel !== null);
  const cvDirty = useCvStore((s) => s.dirty);
  const draftParentId = useCvStore((s) => s.draftParentId);
  const discardDraft = useCvStore((s) => s.discardDraft);

  const profileDirty = useProfileStore((s) => s.dirty);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  const [cloudEnabled, setCloudEnabled] = useState(() => isSupabaseConfigured());
  const [syncingLocal, setSyncingLocal] = useState(false);
  const session = useSyncExternalStore(
    onAuthStateChange,
    getStoredSession,
    () => null
  );

  const isProfile = pathname.startsWith("/perfil");
  const isGallery = pathname === "/";
  const isEditor = pathname.startsWith("/editor");
  const isLogin = pathname.startsWith("/login");

  // Rehydrate the persisted draft and check runtime Supabase config on client
  useEffect(() => {
    useCvStore.persist.rehydrate();
    ensureSupabaseConfigLoaded().then((enabled) => {
      setCloudEnabled(enabled);
      if (enabled && !getStoredSession() && !pathname.startsWith("/login")) {
        router.replace("/login");
      }
    });
  }, [pathname, router]);

  // Browser reload / tab close guard for unsaved changes in either store
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (profileDirty || cvDirty) {
        if (cvDirty) {
          sessionStorage.setItem("cv_discard_pending", "true");
        }
        e.preventDefault();
      }
    };

    // If user clicked 'Cancel' on browser's reload prompt, window regains focus
    const handleWindowFocus = () => {
      sessionStorage.removeItem("cv_discard_pending");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [profileDirty, cvDirty]);

  const handleLeaveProfile = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isProfile && profileDirty) {
      if (!window.confirm(CONFIRM_LEAVE_PROFILE)) {
        e.preventDefault();
        return;
      }
      fetchProfile();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    discardDraft();
    router.replace("/login");
  };

  const handleSyncLocalToCloud = async () => {
    if (syncingLocal) return;
    setSyncingLocal(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/auth/sync-local`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Error ${res.status}`);
      }
      const data = await res.json();
      await fetchProfile();
      alert(
        `Sincronización completada: Perfil=${
          data.profile_synced ? "OK" : "Sin cambios"
        }, Snapshots subidos=${data.snapshots_synced}`
      );
      if (pathname === "/") {
        window.location.reload();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al sincronizar datos locales");
    } finally {
      setSyncingLocal(false);
    }
  };

  const editorHref = `/editor/${draftParentId ?? "nuevo"}`;

  return (
    <header className="h-14 shrink-0 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md px-6 flex items-center justify-between gap-6 z-30">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            CV Tailor
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {cloudEnabled ? "Cloud" : "Local"}
            </span>
          </h1>
        </div>

        {!isLogin && (
          <nav className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <Link
              href="/"
              onClick={handleLeaveProfile}
              className={`${tabBase} ${isGallery ? tabActive : tabIdle}`}
            >
              <FileStack className="w-3.5 h-3.5" />
              CVs
            </Link>

            <Link
              href="/perfil"
              className={`${tabBase} ${isProfile ? tabActive : tabIdle}`}
              title={profileDirty ? "Perfil con cambios sin guardar" : "Perfil Maestro"}
            >
              <UserRound className="w-3.5 h-3.5" />
              Perfil
              {profileDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </Link>

            {hasDraft ? (
              <Link
                href={editorHref}
                onClick={handleLeaveProfile}
                className={`${tabBase} ${isEditor ? tabActive : tabIdle}`}
                title={cvDirty ? "Borrador con cambios sin guardar" : "Borrador activo"}
              >
                <PenSquare className="w-3.5 h-3.5" />
                Editor
                {cvDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </Link>
            ) : (
              <span
                className={`${tabBase} ${tabDisabled}`}
                title="Abrí o creá un CV desde la galería"
              >
                <PenSquare className="w-3.5 h-3.5" />
                Editor
              </span>
            )}
          </nav>
        )}
      </div>

      {cloudEnabled && !isLogin && (
        <div className="flex items-center gap-2.5">
          {session?.user ? (
            <>
              <span className="text-xs text-zinc-400 hidden md:inline truncate max-w-[180px]">
                {session.user.email}
              </span>
              <button
                type="button"
                onClick={handleSyncLocalToCloud}
                disabled={syncingLocal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 text-xs text-emerald-300 transition"
                title="Subir out/profile.json y out/snapshots locales a tu cuenta de Supabase"
              >
                {syncingLocal ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                Subir locales
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-medium text-emerald-400 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              Iniciar sesión
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
