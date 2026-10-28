import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  ExportSnapshotResponse,
  FitReport,
  JobSpec,
  PreviewResponse,
  RenderModel,
  Snapshot,
  TailorRequest,
  TailorResponse,
} from "@/types/cv";

export interface AtsSummary {
  score: number;
  passed: boolean;
  matches: string[];
  gaps: string[];
  issues: string[];
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

  // Export state
  exportingPdf: boolean;
  savingSnapshot: boolean;

  // Draft state (single active draft, persisted in localStorage)
  draftParentId: string | null;
  dirty: boolean;
  hydrated: boolean;

  fetchPreview: (model?: RenderModel) => Promise<void>;
  updateModel: (updater: (prev: RenderModel) => RenderModel, debounceMs?: number) => void;
  tailorCv: (req: TailorRequest) => Promise<TailorResponse>;
  exportPdf: () => Promise<void>;
  saveSnapshot: () => Promise<ExportSnapshotResponse>;
  loadSnapshotDraft: (snapshot: Snapshot) => void;
  startBaseDraft: () => Promise<void>;
  discardDraft: () => void;
  revertDraft: () => Promise<void>;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let previewSeq = 0;

function clearPendingPreview() {
  previewSeq++;
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

        exportingPdf: false,
        savingSnapshot: false,

        draftParentId: null,
        dirty: false,
        hydrated: false,

        fetchPreview: async (model?: RenderModel) => {
          const seq = ++previewSeq;
          set({ loading: true, error: null });
          try {
            const targetModel = model ?? get().renderModel;
            const res = await fetch(`${API_BASE_URL}/api/render/preview`, {
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
            // Drop stale responses (draft replaced/discarded while in flight)
            if (seq !== previewSeq) return;
            set({
              svg: data.svg,
              fitReport: data.fit_report,
              // Only overwrite renderModel on initial hydration or explicit reset (when model argument was not passed)
              ...(model ? {} : { renderModel: data.render_model }),
              loading: false,
            });
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

          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }

          if (debounceMs > 0) {
            debounceTimer = setTimeout(() => {
              get().fetchPreview(next);
            }, debounceMs);
          } else {
            get().fetchPreview(next);
          }
        },

        tailorCv: async (req: TailorRequest): Promise<TailorResponse> => {
          set({ tailorLoading: true, tailorError: null });
          try {
            const res = await fetch(`${API_BASE_URL}/api/tailor`, {
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
            const res = await fetch(`${API_BASE_URL}/api/export/pdf`, {
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

            let filename = "CV.pdf";
            const disposition = res.headers.get("Content-Disposition");
            if (disposition) {
              const match = disposition.match(/filename="?([^";]+)"?/i);
              if (match && match[1]) {
                filename = match[1];
              }
            }

            const blob = await res.blob();
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
            const res = await fetch(`${API_BASE_URL}/api/export/snapshot`, {
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
              throw new Error(`Error al guardar versión (${res.status} ${res.statusText})`);
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
          set({
            renderModel: snapshot.render_model,
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
        },

        startBaseDraft: async () => {
          get().discardDraft();
          // Null model makes the backend render the master profile
          await get().fetchPreview();
          if (get().renderModel) set({ dirty: true });
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
            const res = await fetch(`${API_BASE_URL}/api/snapshots/${parentId}`);
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
    }),
    {
      name: "cv-tailor-draft",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
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
