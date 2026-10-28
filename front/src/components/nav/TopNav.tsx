"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect } from "react";
import { FileStack, PenSquare, Sparkles, UserRound } from "lucide-react";
import { useCvStore } from "@/store/useCvStore";
import { useProfileStore } from "@/store/useProfileStore";

const tabBase =
  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition";
const tabActive = "bg-zinc-800 text-zinc-100 shadow-sm";
const tabIdle = "text-zinc-400 hover:text-zinc-200";
const tabDisabled = "text-zinc-600 cursor-not-allowed";

const CONFIRM_LEAVE_PROFILE =
  "Tenés cambios sin guardar en tu Perfil Maestro. ¿Seguro que querés salir sin guardar?";

export function TopNav() {
  const pathname = usePathname();
  const hasDraft = useCvStore((s) => s.renderModel !== null);
  const cvDirty = useCvStore((s) => s.dirty);
  const draftParentId = useCvStore((s) => s.draftParentId);

  const profileDirty = useProfileStore((s) => s.dirty);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  // Rehydrate the persisted draft on the client only (avoids SSR mismatch)
  useEffect(() => {
    useCvStore.persist.rehydrate();
  }, []);

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

  const isProfile = pathname.startsWith("/perfil");
  const isGallery = pathname === "/";
  const isEditor = pathname.startsWith("/editor");

  const handleLeaveProfile = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isProfile && profileDirty) {
      if (!window.confirm(CONFIRM_LEAVE_PROFILE)) {
        e.preventDefault();
        return;
      }
      fetchProfile();
    }
  };

  const editorHref = `/editor/${draftParentId ?? "nuevo"}`;

  return (
    <header className="h-14 shrink-0 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md px-6 flex items-center gap-6 z-30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Sparkles className="w-4 h-4" />
        </div>
        <h1 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
          CV Tailor
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            F3 MVP
          </span>
        </h1>
      </div>

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
          <span className={`${tabBase} ${tabDisabled}`} title="Abrí o creá un CV desde la galería">
            <PenSquare className="w-3.5 h-3.5" />
            Editor
          </span>
        )}
      </nav>
    </header>
  );
}
