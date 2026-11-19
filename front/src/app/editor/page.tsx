"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCvStore } from "@/store/useCvStore";
import { isProfileEmpty, useProfileStore } from "@/store/useProfileStore";
import { getStoredSession } from "@/lib/supabase";
import { clearDraft, clearPendingAction, getPendingAction, loadDraft } from "@/lib/draft";
import { DEFAULT_ANONYMOUS_PROFILE, profileToRenderModel } from "@/lib/profileTransform";
import { buildRenderModelFromProfile, mergeProfileWithDraft } from "@/lib/api";
import { confirmChoice } from "@/store/useConfirmStore";
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
    // Si Zustand persist ya hidrató antes del primer render pero el estado no se actualizó
    if (!hydrated && useCvStore.persist?.hasHydrated()) {
      useCvStore.setState({ hydrated: true });
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || initHandledRef.current) return;
    initHandledRef.current = true;

    const session = getStoredSession();
    const hasAuth = Boolean(session?.access_token);
    setIsAnonymous(!hasAuth);

    const initEditor = async () => {
      const localDraft = loadDraft();

      if (!hasAuth) {
        const targetProfile =
          localDraft && localDraft.profile && !isProfileEmpty(localDraft.profile)
            ? localDraft.profile
            : DEFAULT_ANONYMOUS_PROFILE;
        const targetTheme = localDraft?.theme || "classic";
        try {
          const model = await buildRenderModelFromProfile(targetProfile, targetTheme);
          loadAnonymousModel(model);
        } catch {
          const fallbackModel = profileToRenderModel(targetProfile, targetTheme);
          loadAnonymousModel(fallbackModel);
        } finally {
          setIsInitializing(false);
        }
        return;
      }

      // ====================================================================
      // MODO AUTENTICADO (Flujo Post-Login y Migración de Borrador)
      // ====================================================================
      try {
        await useProfileStore.getState().fetchProfile().catch(() => {});
        const cloudProfile = useProfileStore.getState().profile;
        const cloudEmpty = isProfileEmpty(cloudProfile);

        const hasValidDraft = Boolean(localDraft?.profile && !isProfileEmpty(localDraft.profile));
        if (localDraft?.profile && !hasValidDraft) {
          clearDraft();
        }

        if (hasValidDraft && localDraft) {
          if (cloudEmpty) {
            // Caso 1: Usuario SIN perfil en la nube -> Migración silenciosa
            useProfileStore.setState({ profile: localDraft.profile });
            await useProfileStore.getState().saveProfile().catch(() => false);
            clearDraft();
            toast.success("Tu perfil fue guardado en tu cuenta.");

            const model = await buildRenderModelFromProfile(localDraft.profile, localDraft.theme || "classic");
            loadAnonymousModel(model);
          } else {
            // Caso 2: Usuario CON perfil en la nube -> Modal claro de 3 opciones
            const draftName = localDraft.profile.full_name?.trim();
            const choice = await confirmChoice({
              title: "Ya tenés un perfil guardado en tu cuenta",
              message: `Subiste un CV nuevo${draftName ? ` (${draftName})` : ""}, pero tu cuenta ya tiene un perfil anterior. ¿Qué querés hacer con los datos que acabás de cargar?`,
              confirmText: "Reemplazar con el CV nuevo",
              secondaryText: "Sumar a mi perfil actual",
              cancelText: "Conservar perfil anterior",
              variant: "default",
            });

            if (choice === "confirm") {
              useProfileStore.setState({ profile: localDraft.profile, dirty: false });
              await useProfileStore.getState().saveProfile().catch(() => false);
              clearDraft();
              toast.success("Tu perfil fue actualizado con el CV recién cargado.");

              const model = await buildRenderModelFromProfile(localDraft.profile, localDraft.theme || "classic");
              loadAnonymousModel(model);
            } else if (choice === "secondary") {
              const merged = await mergeProfileWithDraft(localDraft.profile);
              useProfileStore.setState({ profile: merged, dirty: false });
              clearDraft();
              toast.success("Se sumaron los datos nuevos a tu perfil existente.");

              const model = await buildRenderModelFromProfile(merged, localDraft.theme || "classic");
              loadAnonymousModel(model);
            } else {
              clearDraft();
              toast.info("Se conservó tu perfil guardado anterior.");
              if (cloudProfile && !cloudEmpty) {
                const model = await buildRenderModelFromProfile(cloudProfile, "classic");
                loadAnonymousModel(model);
              } else {
                await startBaseDraft();
              }
            }
          }
        } else {
          // Sin borrador local
          const currentModel = useCvStore.getState().renderModel;
          if (!currentModel) {
            if (cloudProfile && !cloudEmpty) {
              const model = await buildRenderModelFromProfile(cloudProfile, "classic");
              loadAnonymousModel(model);
            } else {
              await startBaseDraft();
            }
          } else {
            fetchPreview(currentModel);
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
        // Garantizar que renderModel NUNCA sea null si la inicialización terminó
        if (!useCvStore.getState().renderModel) {
          const storeProfile = useProfileStore.getState().profile;
          const fallbackProfile =
            storeProfile && !isProfileEmpty(storeProfile)
              ? storeProfile
              : DEFAULT_ANONYMOUS_PROFILE;
          const model = profileToRenderModel(fallbackProfile, "classic");
          loadAnonymousModel(model);
        }
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
