"use client";

import {
  API_BASE_URL,
  ensureSupabaseConfigLoaded,
  getValidAccessToken,
  isSupabaseConfigured,
} from "@/lib/supabase";

export { API_BASE_URL };

export async function apiFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_BASE_URL}${pathOrUrl}`;
  const headers = new Headers(init?.headers);

  await ensureSupabaseConfigLoaded();

  if (isSupabaseConfigured()) {
    const token = await getValidAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (
    res.status === 401 &&
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.replace("/login");
  }

  return res;
}

// ============================================================================
// Stubs y Contratos de Onboarding Anónimo y Cuota de Adaptaciones
// ============================================================================

import {
  AnonymousExportPdfRequest,
  AnonymousParseResponse,
  AnonymousPreviewRequest,
  AnonymousPreviewResponse,
  GitHubImportResponse,
  LangCode,
  RenderModel,
  TailorQuotaResponse,
} from "@/types/cv";

/**
 * Parsea un CV (PDF/TXT) subido por un usuario anónimo sin requerir sesión.
 * Rate-limited por IP en backend (~3/día).
 */
export async function parseAnonymousCv(
  file: File,
  sourceLang: string = "auto"
): Promise<AnonymousParseResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source_lang", sourceLang);

  const res = await apiFetch("/api/anonymous/parse", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: "Error al parsear CV anónimo" }));
    throw new Error(errorBody.detail || "Error en el servidor al parsear CV");
  }

  return res.json();
}

/**
 * Compila un RenderModel anónimo a SVG con telemetría de ajuste sin persistir en base.
 */
export async function previewAnonymousCv(
  renderModel: RenderModel
): Promise<AnonymousPreviewResponse> {
  const payload: AnonymousPreviewRequest = { render_model: renderModel };
  const res = await apiFetch("/api/anonymous/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: "Error al renderizar preview anónimo" }));
    throw new Error(errorBody.detail || "Error en el servidor al renderizar preview");
  }

  return res.json();
}

/**
 * Compila un RenderModel anónimo a PDF binario para descarga directa.
 */
export async function exportAnonymousPdf(
  renderModel: RenderModel,
  role?: string
): Promise<Blob> {
  const payload: AnonymousExportPdfRequest = {
    render_model: renderModel,
    role: role || null,
  };
  const res = await apiFetch("/api/anonymous/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: "Error al exportar PDF anónimo" }));
    throw new Error(errorBody.detail || "Error en el servidor al exportar PDF");
  }

  return res.blob();
}

/**
 * Consulta la cuota de adaptaciones IA del usuario autenticado (2 adaptaciones free).
 */
export async function getTailorQuota(): Promise<TailorQuotaResponse> {
  const res = await apiFetch("/api/tailor/quota");
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: "Error al consultar cuota" }));
    throw new Error(errorBody.detail || "Error al consultar cuota de adaptaciones");
  }
  return res.json();
}

/**
 * Importa y sintetiza un proyecto desde una URL pública de GitHub.
 */
export async function importGitHubProject(
  url: string,
  lang: LangCode = "es"
): Promise<GitHubImportResponse> {
  const res = await apiFetch("/api/profile/import/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, lang }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({
      detail: "Error al importar proyecto desde GitHub",
    }));
    throw new Error(errorBody.detail || "Error en el servidor al importar proyecto de GitHub");
  }

  return res.json();
}

