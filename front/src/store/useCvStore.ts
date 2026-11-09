import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  ATSBreakdown,
  ATSEvaluateResponse,
  ExportSnapshotResponse,
  FitReport,
  JobSpec,
  PreviewResponse,
  RenderModel,
  Snapshot,
  TailorRequest,
  TailorResponse,
  UpsertBulletFactResponse,
} from "@/types/cv";
import { useProfileStore } from "@/store/useProfileStore";
import { API_BASE_URL, apiFetch, exportAnonymousPdf, previewAnonymousCv } from "@/lib/api";
import { getStoredSession } from "@/lib/supabase";
import { saveDraft } from "@/lib/draft";
import { renderModelToProfile } from "@/lib/profileTransform";

export { API_BASE_URL };

export interface AtsSummary {
  score: number;
  passed: boolean;
  matches: string[];
  gaps: string[];
  issues: string[];
  breakdown?: ATSBreakdown;
}

interface CvState {
  renderModel: RenderModel | null;
  svg: string;
  fitReport: FitReport | null;
  loading: boolean;
  error: string | null;

  // Tailor flow state
  tailorLoading: boolean;
  tailorError: string | null;
  lastJobSpec: JobSpec | null;
  lastAts: AtsSummary | null;
  evaluatingAts: boolean;

  // Export state
  exportingPdf: boolean;
  savingSnapshot: boolean;

  // Draft state (single active draft, persisted in localStorage)
  draftParentId: string | null;
  dirty: boolean;
  hydrated: boolean;

  fetchPreview: (model?: RenderModel) => Promise<void>;
  evaluateAts: (model?: RenderModel) => Promise<void>;
  updateModel: (updater: (prev: RenderModel) => RenderModel, debounceMs?: number) => void;
  tailorCv: (req: TailorRequest) => Promise<TailorResponse>;
  exportPdf: () => Promise<void>;
  saveSnapshot: () => Promise<ExportSnapshotResponse>;
  loadSnapshotDraft: (snapshot: Snapshot) => void;
  loadAnonymousModel: (model: RenderModel) => void;
  startBaseDraft: () => Promise<void>;
  setDraftRole: (role: string) => void;
  discardDraft: () => void;
  revertDraft: () => Promise<void>;
  saveBulletToProfile: (
    sectionKey: "experience" | "projects" | "education",
    entryId: string,
    bulletIndex: number,
  ) => Promise<{ factId: string; created: boolean }>;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let previewSeq = 0;
let atsSeq = 0;

function clearPendingPreview() {
  previewSeq++;
  atsSeq++;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export const useCvStore = create<CvState>()(
  persist(
    (set, get) => ({
        renderModel: null,
        svg: "",
        fitReport: null,
        loading: false,
        error: null,

        tailorLoading: false,
        tailorError: null,
        lastJobSpec: null,
        lastAts: null,
        evaluatingAts: false,

        exportingPdf: false,
        savingSnapshot: false,

        draftParentId: null,
        dirty: false,
        hydrated: false,

        evaluateAts: async (model?: RenderModel) => {
          const seq = ++atsSeq;
          const targetModel = model ?? get().renderModel;
          if (!targetModel) return;

          set({ evaluatingAts: true });
          try {
            const targetKeywords = get().lastJobSpec?.keywords || null;
            const res = await apiFetch(`${API_BASE_URL}/api/ats/evaluate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                render_model: targetModel,
                target_keywords: targetKeywords,
              }),
            });

            if (!res.ok) {
              throw new Error(`ATS API error: ${res.status}`);
            }

            const data: ATSEvaluateResponse = await res.json();
            if (seq !== atsSeq) return;

            set({
              lastAts: {
                score: data.total_score,
                passed: data.passed,
                matches: data.keyword_matches,
                gaps: data.keyword_gaps,
                issues: data.issues,
                breakdown: data.breakdown,
              },
              evaluatingAts: false,
            });
          } catch {
            if (seq !== atsSeq) return;
            set({ evaluatingAts: false });
          }
        },

        fetchPreview: async (model?: RenderModel) => {
          const seq = ++previewSeq;
          set({ loading: true, error: null });
          try {
            let targetModel = model ?? get().renderModel;
            if (!targetModel) {
              set({ loading: false });
              return;
            }

            const profilePhoto = useProfileStore.getState().profile?.contact?.photo_url;
            if (profilePhoto && !targetModel.contact?.photo_url) {
              targetModel = {
                ...targetModel,
                contact: { ...targetModel.contact, photo_url: profilePhoto },
                photo_path: profilePhoto,
              };
            }

            const isAuthenticated = Boolean(getStoredSession()?.access_token);
            let svg = "";
            let fitReport: FitReport | null = null;
            let finalModel = targetModel;

            if (!isAuthenticated) {
              try {
                const anonData = await previewAnonymousCv(targetModel);
                svg = anonData.svg;
                fitReport = anonData.fit_report;
                finalModel = anonData.render_model;
              } catch {
                // Fallback intento con endpoint regular
                const res = await apiFetch(`${API_BASE_URL}/api/render/preview`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ render_model: targetModel }),
                });
                if (!res.ok) throw new Error(`API error: ${res.status}`);
                const data: PreviewResponse = await res.json();
                svg = data.svg;
                fitReport = data.fit_report;
                finalModel = data.render_model;
              }
            } else {
              const res = await apiFetch(`${API_BASE_URL}/api/render/preview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  render_model: targetModel,
                }),
              });

              if (!res.ok) {
                throw new Error(`API error: ${res.status} ${res.statusText}`);
              }

              const data: PreviewResponse = await res.json();
              svg = data.svg;
              fitReport = data.fit_report;
              finalModel = data.render_model;
            }

            // Drop stale responses (draft replaced/discarded while in flight)
            if (seq !== previewSeq) return;
            set({
              svg,
              fitReport,
              // Only overwrite renderModel on initial hydration or explicit reset (when model argument was not passed)
              ...(model ? {} : { renderModel: finalModel }),
              loading: false,
            });
            if (!model) {
              get().evaluateAts(finalModel);
            }
          } catch (err: unknown) {
            if (seq !== previewSeq) return;
            const message = err instanceof Error ? err.message : "Error al conectar con el servidor";
            set({ error: message, loading: false });
          }
        },

        updateModel: (updater: (prev: RenderModel) => RenderModel, debounceMs: number = 0) => {
          const current = get().renderModel;
          if (!current) return;
          const next = updater(current);
          set({ renderModel: next, dirty: true });

          // Persistir borrador reactivo en localStorage si es usuario anónimo
          if (!getStoredSession()?.access_token) {
            try {
              const prof = renderModelToProfile(next);
              saveDraft(prof, next.theme);
            } catch (e) {
              console.error("Error al persistir borrador anónimo reactivo:", e);
            }
          }

          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }

          if (debounceMs > 0) {
            debounceTimer = setTimeout(() => {
              get().fetchPreview(next);
              get().evaluateAts(next);
            }, debounceMs);
          } else {
            get().fetchPreview(next);
            get().evaluateAts(next);
          }
        },

        tailorCv: async (req: TailorRequest): Promise<TailorResponse> => {
          set({ tailorLoading: true, tailorError: null });
          try {
            const res = await apiFetch(`${API_BASE_URL}/api/tailor`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(req),
            });

            if (!res.ok) {
              let errDetail = `Error ${res.status}: ${res.statusText}`;
              try {
                const body = await res.json();
                if (body.detail) {
                  errDetail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
                }
              } catch {
                // Keep errDetail
              }
              throw new Error(errDetail);
            }

            const data: TailorResponse = await res.json();

            set({
              renderModel: data.render_model,
              svg: data.svg,
              fitReport: data.fit_report,
              lastJobSpec: data.job_spec,
              lastAts: {
                score: data.ats_score,
                passed: data.ats_passed,
                matches: data.keyword_matches,
                gaps: data.keyword_gaps,
                issues: data.ats_issues,
              },
              tailorLoading: false,
              tailorError: null,
              draftParentId: null,
              dirty: true,
            });

            return data;
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error al adaptar el CV";
            set({ tailorError: message, tailorLoading: false });
            throw err;
          }
        },

        exportPdf: async () => {
          const model = get().renderModel;
          if (!model) return;
          set({ exportingPdf: true });
          try {
            const isAuthenticated = Boolean(getStoredSession()?.access_token);
            let blob: Blob;
            let filename = "CV.pdf";

            if (!isAuthenticated) {
              try {
                blob = await exportAnonymousPdf(model, get().lastJobSpec?.role || undefined);
              } catch {
                // Fallback a endpoint regular si la ruta anónima fallase
                const res = await apiFetch(`${API_BASE_URL}/api/export/pdf`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    render_model: model,
                    role: get().lastJobSpec?.role || null,
                  }),
                });
                if (!res.ok) throw new Error(`Error al exportar PDF (${res.status})`);
                blob = await res.blob();
              }
            } else {
              const res = await apiFetch(`${API_BASE_URL}/api/export/pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  render_model: model,
                  role: get().lastJobSpec?.role || null,
                }),
              });

              if (!res.ok) {
                throw new Error(`Error al exportar PDF (${res.status} ${res.statusText})`);
              }

              const disposition = res.headers.get("Content-Disposition");
              if (disposition) {
                const match = disposition.match(/filename="?([^";]+)"?/i);
                if (match && match[1]) {
                  filename = match[1];
                }
              }

              blob = await res.blob();
            }

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            set({ exportingPdf: false });
          } catch (err: unknown) {
            set({ exportingPdf: false });
            throw err;
          }
        },

        saveSnapshot: async (): Promise<ExportSnapshotResponse> => {
          const model = get().renderModel;
          if (!model) throw new Error("No hay modelo de CV disponible para guardar.");
          set({ savingSnapshot: true });
          try {
            const res = await apiFetch(`${API_BASE_URL}/api/export/snapshot`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                render_model: model,
                job_spec: get().lastJobSpec,
                ats_score: get().lastAts?.score ?? null,
                parent_id: get().draftParentId,
                metadata: {
                  source: "web_ui",
                  user_saved_at: new Date().toISOString(),
                },
              }),
            });

            if (!res.ok) {
              const body = await res.json().catch(() => null);
              throw new Error(`Error al guardar versión (${res.status}): ${body?.detail || res.statusText}`);
            }

            const data: ExportSnapshotResponse = await res.json();
            // Subsequent saves chain from this version (fork lineage)
            set({ savingSnapshot: false, draftParentId: data.id, dirty: false });
            return data;
          } catch (err: unknown) {
            set({ savingSnapshot: false });
            throw err;
          }
        },

        loadSnapshotDraft: (snapshot: Snapshot) => {
          clearPendingPreview();
          const profilePhoto = useProfileStore.getState().profile?.contact?.photo_url;
          const model: RenderModel = { ...snapshot.render_model };
          if (profilePhoto && !model.contact?.photo_url) {
            model.contact = { ...model.contact, photo_url: profilePhoto };
            model.photo_path = profilePhoto;
          }
          set({
            renderModel: model,
            svg: "",
            loading: false,
            fitReport: null,
            error: null,
            lastJobSpec: snapshot.job_spec,
            lastAts:
              snapshot.ats_score === null
                ? null
                : {
                    score: snapshot.ats_score,
                    passed: snapshot.ats_score >= 85,
                    matches: [],
                    gaps: [],
                    issues: [],
                  },
            draftParentId: snapshot.id,
            dirty: false,
          });
          get().evaluateAts(snapshot.render_model);
        },

        loadAnonymousModel: (model: RenderModel) => {
          clearPendingPreview();
          set({
            renderModel: model,
            svg: "",
            loading: false,
            fitReport: null,
            error: null,
            lastJobSpec: null,
            lastAts: null,
            draftParentId: null,
            dirty: false,
          });
          get().fetchPreview(model);
        },

        startBaseDraft: async () => {
          get().discardDraft();
          // Null model makes the backend render the master profile
          await get().fetchPreview();
          if (get().renderModel) set({ dirty: true });
        },

        setDraftRole: (role: string) => {
          const currentSpec = get().lastJobSpec;
          const currentModel = get().renderModel;
          const trimmedRole = role.trim();

          const updatedSpec: JobSpec = currentSpec
            ? { ...currentSpec, role: trimmedRole || null }
            : {
                lang: currentModel?.lang || "es",
                role: trimmedRole || null,
                company: null,
                keywords: [],
                must_have: [],
                nice_to_have: [],
                responsibilities: [],
              };

          set({ lastJobSpec: updatedSpec, dirty: true });
        },

        discardDraft: () => {
          clearPendingPreview();
          set({
            renderModel: null,
            svg: "",
            loading: false,
            fitReport: null,
            error: null,
            lastJobSpec: null,
            lastAts: null,
            draftParentId: null,
            dirty: false,
          });
        },

        revertDraft: async () => {
          clearPendingPreview();
          const parentId = get().draftParentId;
          if (!parentId) {
            get().discardDraft();
            return;
          }
          try {
            const res = await apiFetch(`${API_BASE_URL}/api/snapshots/${parentId}`);
            if (!res.ok) {
              get().discardDraft();
              return;
            }
            const snapshot: Snapshot = await res.json();
            get().loadSnapshotDraft(snapshot);
            await get().fetchPreview();
          } catch {
            get().discardDraft();
          }
        },

        saveBulletToProfile: async (
          sectionKey: "experience" | "projects" | "education",
          entryId: string,
          bulletIndex: number,
        ) => {
          const model = get().renderModel;
          if (!model) throw new Error("No hay modelo de CV activo.");

          const sectionEntries = model[sectionKey];
          const entry = sectionEntries.find((e) => e.entry_id === entryId);
          if (!entry) throw new Error(`Entrada ${entryId} no encontrada en ${sectionKey}.`);

          const bullet = entry.bullets[bulletIndex];
          if (!bullet) throw new Error(`Viñeta en índice ${bulletIndex} no encontrada.`);

          const existingFactId = bullet.fact_ids && bullet.fact_ids.length > 0 ? bullet.fact_ids[0] : null;

          const res = await apiFetch(`${API_BASE_URL}/api/profile/facts/upsert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entry_id: entryId,
              fact_id: existingFactId,
              text: bullet.text,
              skill_ids: bullet.skill_ids || [],
            }),
          });

          if (!res.ok) {
            let errorMsg = `Error ${res.status}: ${res.statusText}`;
            try {
              const body = await res.json();
              if (body.detail) errorMsg = body.detail;
            } catch {
              // fallback
            }
            throw new Error(errorMsg);
          }

          const data: UpsertBulletFactResponse = await res.json();

          // Sincronizar el store de perfil si está instanciado
          useProfileStore.getState().fetchProfile();

          // Actualizar el fact_id en el bullet del modelo activo si era nuevo
          if (data.created || !existingFactId) {
            set((state) => {
              if (!state.renderModel) return state;
              const nextModel = { ...state.renderModel };
              const targetSection = [...nextModel[sectionKey]];
              const targetIdx = targetSection.findIndex((e) => e.entry_id === entryId);
              if (targetIdx >= 0) {
                const targetEntry = { ...targetSection[targetIdx] };
                const bullets = [...targetEntry.bullets];
                bullets[bulletIndex] = {
                  ...bullets[bulletIndex],
                  fact_ids: [data.fact.id],
                };
                targetEntry.bullets = bullets;
                targetSection[targetIdx] = targetEntry;
                nextModel[sectionKey] = targetSection;
              }
              return { renderModel: nextModel };
            });
          }

          return { factId: data.fact.id, created: data.created };
        },
    }),
    {
      name: "cv-tailor-draft",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        renderModel: state.renderModel,
        lastJobSpec: state.lastJobSpec,
        lastAts: state.lastAts,
        draftParentId: state.draftParentId,
        dirty: state.dirty,
      }),
      onRehydrateStorage: () => () => {
        useCvStore.setState({ hydrated: true });
      },
    },
  ),
);
