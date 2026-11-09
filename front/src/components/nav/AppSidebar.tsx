"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState, useSyncExternalStore } from "react";
import {
  CloudUpload,
  FileStack,
  Loader2,
  LogIn,
  PenSquare,
  UserRound,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
} from "lucide-react";
import { TailorScissors } from "@/components/landing/TailoringIcons";
import { useCvStore } from "@/store/useCvStore";
import { useProfileStore } from "@/store/useProfileStore";
import { apiFetch, API_BASE_URL, getTailorQuota } from "@/lib/api";
import { savePendingAction } from "@/lib/draft";
import { usePaywallStore } from "@/store/usePaywallStore";
import { TailorQuotaResponse } from "@/types/cv";
import {
  ensureSupabaseConfigLoaded,
  getStoredSession,
  isSupabaseConfigured,
  onAuthStateChange,
  signOut,
} from "@/lib/supabase";
import { TailorModal } from "@/components/tailor/TailorModal";
import { confirmDialog } from "@/store/useConfirmStore";
import { toast } from "@/store/useToastStore";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isLanding = pathname === "/";
  const isEditor = pathname.startsWith("/editor");
  const isProfile = pathname.startsWith("/perfil");
  const isGallery = pathname.startsWith("/cvs");
  const isLogin = pathname.startsWith("/login");

  // Estado de colapso derivado: en el editor arranca cerrado por defecto
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editorSidebarOpen, setEditorSidebarOpen] = useState(false);
  const collapsed = isEditor ? !editorSidebarOpen : sidebarCollapsed;

  const [isTailorOpen, setIsTailorOpen] = useState(false);

  const hasDraft = useCvStore((s) => s.renderModel !== null);
  const cvDirty = useCvStore((s) => s.dirty);
  const draftParentId = useCvStore((s) => s.draftParentId);
  const discardDraft = useCvStore((s) => s.discardDraft);

  const profileDirty = useProfileStore((s) => s.dirty);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  const [cloudEnabled, setCloudEnabled] = useState(() => isSupabaseConfigured());
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [quota, setQuota] = useState<TailorQuotaResponse | null>(null);
  const openPaywall = usePaywallStore((s) => s.openPaywall);

  const session = useSyncExternalStore(
    onAuthStateChange,
    getStoredSession,
    () => null
  );

  const handleToggleCollapse = () => {
    if (isEditor) {
      setEditorSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  useEffect(() => {
    useCvStore.persist.rehydrate();
    ensureSupabaseConfigLoaded().then((enabled) => {
      setCloudEnabled(enabled);
      // Permitir /editor a usuarios no autenticados (Modo Anónimo)
      if (
        enabled &&
        !getStoredSession() &&
        !pathname.startsWith("/login") &&
        pathname !== "/" &&
        !pathname.startsWith("/editor")
      ) {
        router.replace("/login");
      }
    });

    if (session?.user) {
      getTailorQuota()
        .then((q) => setQuota(q))
        .catch(() => {
          // Fallback silencioso si no hay respuesta de cuota
        });
    } else {
      setQuota(null);
    }
  }, [pathname, router, session?.user]);

  const handleNavigateWithGuard = async (e: React.MouseEvent, href: string) => {
    if (pathname === href) return;

    if (isProfile && profileDirty) {
      e.preventDefault();
      const ok = await confirmDialog({
        title: "¿Descartar cambios?",
        message: "Tenés cambios sin guardar en tu Perfil Maestro. ¿Querés salir y descartar las modificaciones?",
        confirmText: "Aceptar",
        cancelText: "Cancelar",
        variant: "warning",
      });
      if (ok) {
        await fetchProfile();
        router.push(href);
      }
      return;
    }

    if (isEditor && cvDirty) {
      e.preventDefault();
      const ok = await confirmDialog({
        title: "¿Descartar cambios?",
        message: "Tenés cambios sin guardar en este borrador de CV. ¿Querés salir y descartar las modificaciones?",
        confirmText: "Aceptar",
        cancelText: "Cancelar",
        variant: "warning",
      });
      if (ok) {
        discardDraft();
        router.push(href);
      }
      return;
    }
  };

  const handleTailorClick = async () => {
    // Si no está autenticado, gatear a login guardando la acción pendiente
    if (!session?.user) {
      savePendingAction("tailor");
      router.push("/login?next=/editor&action=tailor");
      return;
    }

    if (isProfile && profileDirty) {
      const ok = await confirmDialog({
        title: "¿Descartar cambios?",
        message: "Tenés cambios sin guardar en tu Perfil Maestro. ¿Querés salir y descartar las modificaciones?",
        confirmText: "Aceptar",
        cancelText: "Cancelar",
        variant: "warning",
      });
      if (!ok) return;
      await fetchProfile();
    } else if (isEditor && cvDirty) {
      const ok = await confirmDialog({
        title: "¿Descartar cambios?",
        message: "Tenés cambios sin guardar en este borrador de CV. ¿Querés salir y descartar las modificaciones?",
        confirmText: "Aceptar",
        cancelText: "Cancelar",
        variant: "warning",
      });
      if (!ok) return;
      discardDraft();
    }
    setIsTailorOpen(true);
  };

  const handleSignOut = async () => {
    const ok = await confirmDialog({
      title: "¿Cerrar sesión?",
      message: "¿Seguro que querés cerrar la sesión activa?",
      confirmText: "Aceptar",
      cancelText: "Cancelar",
      variant: "default",
    });
    if (!ok) return;

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
      toast.success(
        `Sincronización OK: Perfil=${data.profile_synced ? "actualizado" : "al día"}, Snapshots=${data.snapshots_synced}`
      );
      if (pathname === "/") {
        window.location.reload();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al sincronizar datos locales");
    } finally {
      setSyncingLocal(false);
    }
  };

  const editorHref = session?.user ? `/editor/${draftParentId ?? "nuevo"}` : "/editor";

  // En la landing o en login simple, no mostramos el sidebar
  if (isLanding || isLogin) return null;

  // Si estamos en el editor y el sidebar está colapsado, no ocupa espacio (ancho 0)
  // para darle el 100% de la pantalla al split-screen de Typst
  if (isEditor && collapsed) {
    return (
      <aside className="w-0 overflow-hidden shrink-0 transition-[width] duration-200">
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="fixed bottom-4 left-4 z-40 p-2 rounded-lg bg-surface/90 border border-hairline text-text-muted hover:text-text-primary shadow-sm backdrop-blur-sm cursor-pointer transition-colors"
          title="Abrir menú lateral"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside
        className={`h-screen shrink-0 border-r border-hairline bg-surface flex flex-col justify-between z-30 transition-[width] duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Cabecera del Sidebar */}
        <div className="flex flex-col">
          <div className="h-14 px-4 flex items-center justify-between border-b border-hairline">
            <Link
              href="/"
              onClick={(e) => handleNavigateWithGuard(e, "/")}
              className={`flex items-center gap-2.5 group overflow-hidden ${
                collapsed ? "justify-center w-full" : ""
              }`}
            >
              <div className="w-7 h-7 rounded-md border border-accent-border bg-accent-subtle flex items-center justify-center text-accent shrink-0 transition-colors group-hover:border-accent">
                <TailorScissors size={15} strokeWidth={1.8} />
              </div>
              {!collapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium tracking-[0.14em] text-text-ivory font-mono truncate">
                    CV-TAILOR
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-raised text-text-muted border border-hairline">
                    {cloudEnabled ? "cloud" : "local"}
                  </span>
                </div>
              )}
            </Link>

            {!collapsed && (
              <button
                type="button"
                onClick={handleToggleCollapse}
                className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-surface-raised transition-colors cursor-pointer"
                title="Colapsar menú lateral"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botón de acción principal: Adaptar a oferta */}
          {!collapsed && (
            <div className="px-3 pt-4 pb-2">
              <button
                type="button"
                onClick={handleTailorClick}
                className="btn-accent w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium shadow-xs cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Adaptar a oferta</span>
              </button>
            </div>
          )}

          {/* Navegación principal */}
          <nav className="p-3 space-y-1">
            <Link
              href="/cvs"
              onClick={(e) => handleNavigateWithGuard(e, "/cvs")}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                collapsed ? "justify-center px-0" : ""
              } ${
                isGallery
                  ? "bg-surface-raised text-text-ivory border border-hairline shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-raised/40"
              }`}
              title="Galería y archivo de CVs"
            >
              <FileStack className="w-4 h-4 shrink-0 text-accent" />
              {!collapsed && <span>Versiones</span>}
            </Link>

            <Link
              href="/perfil"
              onClick={(e) => handleNavigateWithGuard(e, "/perfil")}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                collapsed ? "justify-center px-0" : ""
              } ${
                isProfile
                  ? "bg-surface-raised text-text-ivory border border-hairline shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-raised/40"
              }`}
              title={profileDirty ? "Perfil con cambios sin guardar" : "Perfil Maestro"}
            >
              <div className="flex items-center gap-3">
                <UserRound className="w-4 h-4 shrink-0 text-text-muted" />
                {!collapsed && <span>Perfil Maestro</span>}
              </div>
              {!collapsed && profileDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-warning" title="Cambios sin guardar" />
              )}
            </Link>

            {hasDraft || !session?.user ? (
              <Link
                href={editorHref}
                onClick={(e) => handleNavigateWithGuard(e, editorHref)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  collapsed ? "justify-center px-0" : ""
                } ${
                  isEditor
                    ? "bg-surface-raised text-text-ivory border border-hairline shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-raised/40"
                }`}
                title={cvDirty ? "Borrador con cambios sin guardar" : "Editor activo"}
              >
                <div className="flex items-center gap-3">
                  <PenSquare className="w-4 h-4 shrink-0 text-text-muted" />
                  {!collapsed && <span>Editor Typst</span>}
                </div>
                {!collapsed && cvDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" title="Cambios sin guardar" />
                )}
              </Link>
            ) : (
              <span
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-text-muted opacity-40 cursor-not-allowed ${
                  collapsed ? "justify-center px-0" : ""
                }`}
                title="Abrí un CV desde Versiones para editar"
              >
                <PenSquare className="w-4 h-4 shrink-0" />
                {!collapsed && <span>Editor Typst</span>}
              </span>
            )}
          </nav>
        </div>

        {/* Footer del Sidebar */}
        <div className="p-3 border-t border-hairline space-y-2">
          {collapsed ? (
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="w-full flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
              title="Expandir menú lateral"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          ) : (
            <>
              {/* Indicador discreto de cuota IA y link a planes */}
              <div className="px-2.5 py-2 rounded-lg bg-canvas/40 border border-hairline space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  {session?.user && quota ? (
                    <span className="text-text-secondary flex items-center gap-1.5 truncate">
                      {quota.has_active_pass ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                          <span className="text-accent font-medium truncate">IA Ilimitada</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-text shrink-0" />
                          <span className="truncate">
                            {Math.max(0, quota.limit - quota.used_count)}/{quota.limit} adaptaciones
                          </span>
                        </>
                      )}
                    </span>
                  ) : session?.user ? (
                    <span className="text-text-muted flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      <span className="truncate">2 adaptaciones free</span>
                    </span>
                  ) : (
                    <span className="text-text-muted flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      <span className="truncate">Modo anónimo</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => openPaywall()}
                    className="text-[11px] text-accent hover:text-accent/80 font-medium underline underline-offset-2 transition-colors cursor-pointer shrink-0 ml-1.5"
                  >
                    Ver planes
                  </button>
                </div>
              </div>

              {cloudEnabled && session?.user && (
                <div className="px-2 py-1.5 rounded-md bg-canvas/40 border border-hairline space-y-1">
                  <p className="text-[10px] font-mono text-text-muted truncate">
                    {session.user.email}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSyncLocalToCloud}
                      disabled={syncingLocal}
                      className="text-[11px] text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Sincronizar snapshots locales a Supabase"
                    >
                      {syncingLocal ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CloudUpload className="w-3 h-3 text-text-muted" />
                      )}
                      <span>Sincronizar</span>
                    </button>
                    <span className="text-text-muted text-[10px]">·</span>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="text-[11px] text-text-muted hover:text-danger transition-colors cursor-pointer"
                    >
                      Salir
                    </button>
                  </div>
                </div>
              )}

              {cloudEnabled && !session?.user && (
                <Link
                  href="/login"
                  className="btn-secondary w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar sesión</span>
                </Link>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Modal Tailor accesible globalmente desde el Sidebar */}
      <TailorModal
        isOpen={isTailorOpen}
        onClose={() => setIsTailorOpen(false)}
        onSuccess={() => {
          setIsTailorOpen(false);
          router.push("/editor/nuevo");
        }}
      />
    </>
  );
}
