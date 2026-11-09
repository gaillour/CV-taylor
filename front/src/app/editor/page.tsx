"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCvStore } from "@/store/useCvStore";
import { isProfileEmpty, useProfileStore } from "@/store/useProfileStore";
import { getStoredSession } from "@/lib/supabase";
import { clearDraft, clearPendingAction, getPendingAction, loadDraft, saveDraft } from "@/lib/draft";
import { DEFAULT_ANONYMOUS_PROFILE, profileToRenderModel } from "@/lib/profileTransform";
import { confirmDialog } from "@/store/useConfirmStore";
import { toast } from "@/store/useToastStore";
import { EditorView } from "@/components/editor/EditorView";

function AnonymousOrCloudEditor() {
  const {
    renderModel,
    hydrated,
    fetchPreview,
    loadAnonymousModel,
    startBaseDraft,
  } = useCvStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [tailorModalOpen, setTailorModalOpen] = useState(false);
  const initHandledRef = useRef(false);

  useEffect(() => {
    if (!hydrated || initHandledRef.current) return;
    initHandledRef.current = true;

    const session = getStoredSession();
    const hasAuth = Boolean(session?.access_token);
    setIsAnonymous(!hasAuth);

    const initEditor = async () => {
      const localDraft = loadDraft();

      if (!hasAuth) {
        // ====================================================================
        // MODO ANÓNIMO
        // ====================================================================
        if (localDraft && localDraft.profile) {
          const model = profileToRenderModel(localDraft.profile, localDraft.theme || "classic");
          loadAnonymousModel(model);
        } else {
          // Inicializar perfil base anónimo por defecto y persistirlo
          saveDraft(DEFAULT_ANONYMOUS_PROFILE, "classic");
          const model = profileToRenderModel(DEFAULT_ANONYMOUS_PROFILE, "classic");
          loadAnonymousModel(model);
        }
        setIsInitializing(false);
        return;
      }

      // ====================================================================
      // MODO AUTENTICADO (Flujo Post-Login y Migración de Borrador)
      // ====================================================================
      try {
        await useProfileStore.getState().fetchProfile();
        const cloudProfile = useProfileStore.getState().profile;
        const cloudEmpty = isProfileEmpty(cloudProfile);

        if (localDraft && localDraft.profile) {
          if (cloudEmpty) {
            // Caso 1: Usuario SIN perfil en la nube -> Migración silenciosa
            useProfileStore.setState({ profile: localDraft.profile });
            await useProfileStore.getState().saveProfile();
            clearDraft();
            toast.success("Borrador local migrado exitosamente a tu cuenta.");

            const model = profileToRenderModel(localDraft.profile, localDraft.theme || "classic");
            loadAnonymousModel(model);
          } else {
            // Caso 2: Usuario CON perfil en la nube -> Modal amigable
            const replace = await confirmDialog({
              title: "Borrador local no guardado",
              message:
                "Tenés un borrador local no guardado. ¿Deseás reemplazar tu perfil actual en la nube con este borrador o descartarlo?",
              confirmText: "Reemplazar mi perfil",
              cancelText: "Descartar borrador",
              variant: "default",
            });

            if (replace) {
              useProfileStore.setState({ profile: localDraft.profile });
              await useProfileStore.getState().saveProfile();
              clearDraft();
              toast.success("Perfil actualizado con el borrador local.");

              const model = profileToRenderModel(localDraft.profile, localDraft.theme || "classic");
              loadAnonymousModel(model);
            } else {
              clearDraft();
              toast.info("Borrador descartado. Cargando tu perfil existente.");
              if (!useCvStore.getState().renderModel) {
                await startBaseDraft();
              } else {
                fetchPreview();
              }
            }
          }
        } else {
          // Sin borrador local
          if (!useCvStore.getState().renderModel) {
            await startBaseDraft();
          } else {
            fetchPreview();
          }
        }

        // ====================================================================
        // Ejecución de Acción Pendiente Post-Login
        // ====================================================================
        const pending = getPendingAction();
        if (pending) {
          if (pending.action === "save") {
            toast.success("Tu CV ha sido guardado en tu cuenta.");
            clearPendingAction();
          } else if (pending.action === "tailor") {
            clearPendingAction();
            setTailorModalOpen(true);
          }
        }
      } catch (err: unknown) {
        console.error("Error al inicializar editor post-login:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initEditor();
  }, [hydrated, fetchPreview, loadAnonymousModel, startBaseDraft]);

  const ready = hydrated && !isInitializing && renderModel !== null;

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm gap-2 font-mono">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
        {isAnonymous ? "Iniciando editor anónimo..." : "Sincronizando perfil..."}
      </div>
    );
  }

  return (
    <EditorView
      isAnonymous={isAnonymous}
      externalTailorOpen={tailorModalOpen}
      onCloseExternalTailor={() => setTailorModalOpen(false)}
    />
  );
}

export default function EditorRootPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm gap-2 font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          Cargando editor...
        </div>
      }
    >
      <AnonymousOrCloudEditor />
    </Suspense>
  );
}
