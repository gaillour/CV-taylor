import {
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
import { API_BASE_URL, apiFetch, exportAnonymousPdf, previewAnonymousCv } from "@/lib/api";

export async function requestCvPreview(
  targetModel: RenderModel | null,
  isAuthenticated: boolean
): Promise<{ svg: string; fitReport: FitReport; renderModel: RenderModel }> {
  if (!isAuthenticated && targetModel) {
    try {
      const anonData = await previewAnonymousCv(targetModel);
      return {
        svg: anonData.svg,
        fitReport: anonData.fit_report,
        renderModel: anonData.render_model,
      };
    } catch {
      // Fallback a endpoint regular si falla el anónimo
      const res = await apiFetch(`${API_BASE_URL}/api/render/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ render_model: targetModel }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: PreviewResponse = await res.json();
      return {
        svg: data.svg,
        fitReport: data.fit_report,
        renderModel: data.render_model,
      };
    }
  }

  const res = await apiFetch(`${API_BASE_URL}/api/render/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      render_model: targetModel || null,
    }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data: PreviewResponse = await res.json();
  return {
    svg: data.svg,
    fitReport: data.fit_report,
    renderModel: data.render_model,
  };
}

export async function requestAtsEvaluation(
  targetModel: RenderModel,
  targetKeywords?: string[] | null
): Promise<ATSEvaluateResponse> {
  const res = await apiFetch(`${API_BASE_URL}/api/ats/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      render_model: targetModel,
      target_keywords: targetKeywords || null,
    }),
  });

  if (!res.ok) {
    throw new Error(`ATS API error: ${res.status}`);
  }

  return (await res.json()) as ATSEvaluateResponse;
}

export async function requestTailorCv(req: TailorRequest): Promise<TailorResponse> {
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

  return (await res.json()) as TailorResponse;
}

export async function downloadCvPdf(
  model: RenderModel,
  role: string | null | undefined,
  isAuthenticated: boolean
): Promise<void> {
  let blob: Blob;
  let filename = "CV.pdf";

  if (!isAuthenticated) {
    try {
      blob = await exportAnonymousPdf(model, role || undefined);
    } catch {
      const res = await apiFetch(`${API_BASE_URL}/api/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          render_model: model,
          role: role || null,
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
        role: role || null,
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
}

export async function persistCvSnapshot(options: {
  model: RenderModel;
  jobSpec: JobSpec | null;
  atsScore: number | null;
  parentId: string | null;
  onOrphanedParent?: () => void;
}): Promise<ExportSnapshotResponse> {
  const postSnapshot = (pId: string | null) =>
    apiFetch(`${API_BASE_URL}/api/export/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        render_model: options.model,
        job_spec: options.jobSpec,
        ats_score: options.atsScore,
        parent_id: pId,
        metadata: {
          source: "web_ui",
          user_saved_at: new Date().toISOString(),
        },
      }),
    });

  let res = await postSnapshot(options.parentId);

  // Si draftParentId quedó huérfano (snapshot borrado o de otro entorno),
  // limpiarlo y guardar como snapshot raíz.
  if (res.status === 404 && options.parentId) {
    options.onOrphanedParent?.();
    res = await postSnapshot(null);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`Error al guardar versión (${res.status}): ${body?.detail || res.statusText}`);
  }

  return (await res.json()) as ExportSnapshotResponse;
}

export async function fetchSnapshotById(id: string): Promise<Snapshot | null> {
  const res = await apiFetch(`${API_BASE_URL}/api/snapshots/${id}`);
  if (!res.ok) return null;
  return (await res.json()) as Snapshot;
}

export async function upsertBulletFact(options: {
  entryId: string;
  factId: string | null;
  text: string;
  skillIds: string[];
}): Promise<UpsertBulletFactResponse> {
  const res = await apiFetch(`${API_BASE_URL}/api/profile/facts/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry_id: options.entryId,
      fact_id: options.factId,
      text: options.text,
      skill_ids: options.skillIds,
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

  return (await res.json()) as UpsertBulletFactResponse;
}
