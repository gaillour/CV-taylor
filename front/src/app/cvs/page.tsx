"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Clock,
  Building,
  ChevronRight,
  ChevronDown,
  Eye,
  ExternalLink,
  Loader2,
  AlertCircle,
  GitBranch,
  Target,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { API_BASE_URL, useCvStore } from "@/store/useCvStore";
import { apiFetch } from "@/lib/api";
import { isProfileEmpty, useProfileStore } from "@/store/useProfileStore";
import { Snapshot, SnapshotSummary } from "@/types/cv";
import { TailorModal } from "@/components/tailor/TailorModal";
import { CvPreview } from "@/components/preview/CvPreview";

interface SnapshotGroup {
  key: string;
  company: string;
  role: string;
  latest: SnapshotSummary;
  history: SnapshotSummary[];
}

export default function GalleryPage() {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Adaptar / Tailor
  const [isTailorOpen, setIsTailorOpen] = useState(false);

  // History expanded state per group
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Preview modal/drawer state
  const [previewSnapshot, setPreviewSnapshot] = useState<Snapshot | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const { loadSnapshotDraft, startBaseDraft, dirty } = useCvStore();
  const { profile, fetchProfile, initialized: profileInitialized } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const profileEmpty = profileInitialized && isProfileEmpty(profile);

  useEffect(() => {
    if (profileInitialized && !loading && isProfileEmpty(profile) && snapshots.length === 0) {
      router.replace("/perfil");
    }
  }, [profileInitialized, loading, profile, snapshots.length, router]);

  useEffect(() => {
    let ignore = false;
    apiFetch(`${API_BASE_URL}/api/snapshots`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json() as Promise<SnapshotSummary[]>;
      })
      .then((data) => {
        if (!ignore) {
          setSnapshots(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error al cargar CVs guardados");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Agrupamiento por empresa / rol
  const groups: SnapshotGroup[] = useMemo(() => {
    const map = new Map<string, SnapshotSummary[]>();
    for (const snap of snapshots) {
      const company = snap.company || "General";
      const role = snap.role || "CV Base";
      const groupKey = `${company}___${role}`.toLowerCase();
      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(snap);
    }

    const result: SnapshotGroup[] = [];
    for (const [key, items] of map.entries()) {
      // items are ordered newest to oldest from backend
      const sorted = [...items].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      result.push({
        key,
        company: sorted[0].company || "General",
        role: sorted[0].role || "CV Base",
        latest: sorted[0],
        history: sorted.slice(1),
      });
    }

    return result.sort(
      (a, b) =>
        new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
    );
  }, [snapshots]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenDraft = async (snapSummary: SnapshotSummary) => {
    if (dirty && !window.confirm("Tenés cambios sin guardar en el borrador actual. ¿Descartarlos y abrir este CV?")) {
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/snapshots/${snapSummary.id}`);
      if (!res.ok) throw new Error("No se pudo obtener el snapshot");
      const fullSnap: Snapshot = await res.json();
      loadSnapshotDraft(fullSnap);
      router.push(`/editor/${fullSnap.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al abrir CV");
    }
  };

  const handleNewBaseCv = async () => {
    if (profileEmpty) {
      router.push("/perfil");
      return;
    }
    if (dirty && !window.confirm("Tenés cambios sin guardar en el borrador actual. ¿Descartar y crear nuevo CV base?")) {
      return;
    }
    await startBaseDraft();
    router.push("/editor/nuevo");
  };

  const handleTailorClick = () => {
    if (profileEmpty) {
      router.push("/perfil");
      return;
    }
    if (dirty && !window.confirm("Tenés cambios sin guardar en el borrador actual. ¿Descartarlos y adaptar un nuevo CV?")) {
      return;
    }
    setIsTailorOpen(true);
  };

  const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("¿Seguro que querés archivar esta versión de CV? Podrás seguir consultando el linaje histórico si es necesario.")) {
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/snapshots/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
      if (previewSnapshot?.id === id) {
        setPreviewSnapshot(null);
        setPreviewSvg("");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al eliminar versión");
    }
  };

  const handleOpenPreview = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewLoading(true);
    setPreviewSnapshot(null);
    setPreviewSvg("");
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/snapshots/${id}`);
      if (!res.ok) throw new Error("Error al cargar snapshot");
      const snap: Snapshot = await res.json();
      setPreviewSnapshot(snap);

      // Pedir render preview de este snapshot
      const renderRes = await apiFetch(`${API_BASE_URL}/api/render/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ render_model: snap.render_model }),
      });
      if (renderRes.ok) {
        const renderData = await renderRes.json();
        setPreviewSvg(renderData.svg);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al previsualizar snapshot");
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  if (!profileInitialized || loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#09090b] text-zinc-100 items-center justify-center py-24 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        <p className="text-xs text-zinc-500 font-mono">Cargando versiones...</p>
      </div>
    );
  }

  if (profileEmpty && snapshots.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#09090b] text-zinc-100 items-center justify-center py-24 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        <p className="text-xs text-zinc-500 font-mono">Redirigiendo a perfil...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#09090b] text-zinc-100 overflow-y-auto">
      {/* Header bar */}
      <div className="max-w-6xl w-full mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            Versiones guardadas
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.08] text-zinc-400">
              {snapshots.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Historial de versiones compiladas en Typst. Hacé click para editar o derivar una nueva variante.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewBaseCv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/[0.08] rounded-md text-xs font-medium transition cursor-pointer"
            title="Crear un borrador de CV en blanco"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>CV en blanco</span>
          </button>

          <button
            onClick={handleTailorClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-medium transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Adaptar a oferta</span>
          </button>
        </div>
      </div>

      {/* Banner Onboarding si el perfil está vacío */}
      {profileEmpty && (
        <div className="max-w-6xl w-full mx-auto px-6 pt-6">
          <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-zinc-800 border border-white/[0.08] text-zinc-300 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-200">
                  Perfil base incompleto
                </p>
                <p className="text-[11px] text-zinc-400">
                  Cargá tus datos y experiencia base para habilitar la adaptación automática a ofertas.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/perfil")}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-medium transition cursor-pointer self-start sm:self-auto shrink-0"
            >
              Completar perfil
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="max-w-6xl w-full mx-auto px-6 py-6 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500 text-xs font-mono gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            <p>Cargando snapshots...</p>
          </div>
        ) : error ? (
          <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/[0.08] rounded-xl bg-zinc-950/40 p-8">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-3">
              <FileText className="w-5 h-5 text-zinc-400" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200">No hay versiones guardadas todavía</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-5">
              Generá tu primer CV adaptado a una oferta laboral con Typst o abrí el editor base para empezar.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleNewBaseCv}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 rounded-md text-xs font-medium transition cursor-pointer"
              >
                Abrir CV base
              </button>
              <button
                onClick={handleTailorClick}
                className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-medium transition cursor-pointer"
              >
                Adaptar oferta
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => {
              const isExpanded = !!expandedGroups[group.key];
              const latest = group.latest;

              return (
                <div
                  key={group.key}
                  className="flex flex-col bg-zinc-950 border border-white/[0.08] hover:border-white/[0.16] rounded-xl overflow-hidden transition group"
                >
                  {/* Card Header & Content */}
                  <div
                    onClick={() => handleOpenDraft(latest)}
                    className="p-5 flex-1 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                          <Building className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="truncate max-w-[130px] font-medium text-zinc-300">
                            {group.company}
                          </span>
                        </div>
                        {latest.ats_score !== null && (
                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                              latest.ats_score >= 85
                                ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
                                : "bg-zinc-900 border-white/[0.08] text-zinc-300"
                            }`}
                          >
                            <Target className="w-3 h-3" />
                            <span className="tabular-nums">ATS {latest.ats_score}%</span>
                          </div>
                        )}
                      </div>

                      {/* Main Role Title */}
                      <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-white transition flex items-center justify-between">
                        <span className="truncate">{group.role}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition shrink-0 ml-1" />
                      </h3>

                      <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1 font-mono">
                        {latest.full_name}
                      </p>
                    </div>

                    {/* Metadata footer inside card */}
                    <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span>{formatDate(latest.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.08] text-zinc-400">
                          {latest.lang}
                        </span>
                        <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.08] text-zinc-400">
                          {latest.theme}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="px-5 py-2.5 bg-zinc-900/40 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleOpenPreview(latest.id, e)}
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition text-[11px]"
                        title="Previsualizar CV"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteSnapshot(latest.id, e)}
                        className="flex items-center gap-1 text-zinc-500 hover:text-rose-400 transition text-[11px]"
                        title="Archivar esta versión de CV"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Archivar</span>
                      </button>
                    </div>

                    {group.history.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(group.key);
                        }}
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition text-[11px] font-mono"
                      >
                        <GitBranch className="w-3 h-3 text-zinc-500" />
                        <span>
                          {group.history.length === 1
                            ? "1 anterior"
                            : `${group.history.length} anteriores`}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* History Dropdown / Fork lineage */}
                  {isExpanded && group.history.length > 0 && (
                    <div className="bg-zinc-950 border-t border-white/[0.06] p-3 space-y-1 text-xs font-mono">
                      <div className="text-[10px] text-zinc-500 px-2 py-0.5 font-medium">
                        Versiones anteriores
                      </div>
                      {group.history.map((hSnap) => (
                        <div
                          key={hSnap.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-900 transition group/item"
                        >
                          <div
                            onClick={() => handleOpenDraft(hSnap)}
                            className="flex-1 cursor-pointer flex flex-col"
                          >
                            <span className="text-[11px] text-zinc-300 group-hover/item:text-white transition">
                              {formatDate(hSnap.created_at)}
                            </span>
                            <span className="text-[10px] text-zinc-500 tabular-nums">
                              {hSnap.id} {hSnap.parent_id ? `← ${hSnap.parent_id}` : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => handleOpenPreview(hSnap.id, e)}
                              className="p-1 hover:text-zinc-200 text-zinc-500 transition"
                              title="Previsualizar esta versión"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSnapshot(hSnap.id, e)}
                              className="p-1 hover:text-rose-400 text-zinc-500 transition"
                              title="Archivar esta versión histórica"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDraft(hSnap)}
                              className="p-1 hover:text-zinc-200 text-zinc-500 transition"
                              title="Abrir para editar"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tailor Modal */}
      <TailorModal
        isOpen={isTailorOpen}
        onClose={() => setIsTailorOpen(false)}
        onSuccess={() => {
          setIsTailorOpen(false);
          router.push("/editor/nuevo");
        }}
      />

      {/* Preview Modal Dialog */}
      {previewSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="relative w-full max-w-4xl h-[90vh] bg-zinc-950 border border-white/[0.08] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="h-12 px-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-zinc-900/40">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-zinc-400" />
                <div>
                  <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                    {previewSnapshot.role || "CV Base"} · {previewSnapshot.company || "General"}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.08] text-zinc-400">
                      {previewSnapshot.id}
                    </span>
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-500 tabular-nums">
                    {formatDate(previewSnapshot.created_at)} · {previewSnapshot.pdf_sha256.slice(0, 10)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const snap = previewSnapshot;
                    setPreviewSnapshot(null);
                    handleOpenDraft(snap as unknown as SnapshotSummary);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-medium transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Editar versión</span>
                </button>
                <button
                  onClick={() => setPreviewSnapshot(null)}
                  className="px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Modal Body: CV Typst SVG preview */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col bg-[#09090b]">
              <CvPreview svg={previewSvg} loading={previewLoading} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
