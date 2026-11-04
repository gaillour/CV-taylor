"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState, useSyncExternalStore } from "react";
import {
  CloudUpload,
  FileStack,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  PenSquare,
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
  const isGallery = pathname.startsWith("/cvs");
  const isEditor = pathname.startsWith("/editor");
  const isLogin = pathname.startsWith("/login");
  const isLanding = pathname === "/";

  // Rehydrate the persisted draft and check runtime Supabase config on client
  useEffect(() => {
    useCvStore.persist.rehydrate();
    ensureSupabaseConfigLoaded().then((enabled) => {
      setCloudEnabled(enabled);
      if (enabled && !getStoredSession() && !pathname.startsWith("/login") && pathname !== "/") {
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

  if (isLanding) return null;

  return (
    <header className="h-12 shrink-0 border-b border-white/[0.08] bg-[#09090b]/90 backdrop-blur-md px-6 flex items-center justify-between gap-6 z-30">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <h1 className="text-xs font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            cv-tailor
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-white/[0.08]">
              {cloudEnabled ? "cloud" : "local"}
            </span>
          </h1>
        </div>

        {!isLogin && (
          <nav className="flex items-center bg-zinc-950 border border-white/[0.08] rounded-md p-0.5">
            <Link
              href="/cvs"
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
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <span className="text-xs font-mono text-zinc-400 hidden md:inline truncate max-w-[180px]">
                {session.user.email}
              </span>
              <button
                type="button"
                onClick={handleSyncLocalToCloud}
                disabled={syncingLocal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-xs text-zinc-300 transition cursor-pointer"
                title="Subir out/profile.json y out/snapshots locales a tu cuenta de Supabase"
              >
                {syncingLocal ? (
                  <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                ) : (
                  <CloudUpload className="w-3 h-3 text-zinc-400" />
                )}
                Subir locales
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 transition cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-3 h-3 text-zinc-400" />
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-white text-xs font-medium text-zinc-950 transition"
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
