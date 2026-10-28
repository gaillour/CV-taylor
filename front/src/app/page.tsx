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
  Sparkles,
} from "lucide-react";
import { API_BASE_URL, useCvStore } from "@/store/useCvStore";
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

  useEffect(() => {
    let ignore = false;
    fetch(`${API_BASE_URL}/api/snapshots`)
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
      const res = await fetch(`${API_BASE_URL}/api/snapshots/${snapSummary.id}`);
      if (!res.ok) throw new Error("No se pudo obtener el snapshot");
      const fullSnap: Snapshot = await res.json();
      loadSnapshotDraft(fullSnap);
      router.push(`/editor/${fullSnap.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al abrir CV");
    }
  };

  const handleNewBaseCv = async () => {
    if (dirty && !window.confirm("Tenés cambios sin guardar en el borrador actual. ¿Descartar y crear nuevo CV base?")) {
      return;
    }
    await startBaseDraft();
    router.push("/editor/nuevo");
  };

  const handleOpenPreview = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewLoading(true);
    setPreviewSnapshot(null);
    setPreviewSvg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/snapshots/${id}`);
      if (!res.ok) throw new Error("Error al cargar snapshot");
      const snap: Snapshot = await res.json();
      setPreviewSnapshot(snap);

      // Pedir render preview de este snapshot
      const renderRes = await fetch(`${API_BASE_URL}/api/render/preview`, {
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black text-zinc-100 overflow-y-auto">
      {/* Header bar */}
      <div className="max-w-6xl w-full mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            CVs Guardados
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              {snapshots.length} versiones
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Historial de CVs y versiones guardadas. Hacé click en cualquier versión para editarla o crear una nueva variante.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleNewBaseCv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo CV Base</span>
          </button>

          <button
            onClick={() => setIsTailorOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm shadow-emerald-950/40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Adaptar con IA</span>
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-6xl w-full mx-auto px-6 py-6 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500 text-sm gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <p>Cargando snapshots...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-800/80 rounded-2xl bg-zinc-950/40 p-8">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <FileText className="w-6 h-6 text-zinc-500" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No hay CVs guardados todavía</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-5">
              Generá tu primer CV adaptado a una oferta laboral con Typst o abrí el editor base para empezar.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewBaseCv}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Abrir CV Base
              </button>
              <button
                onClick={() => setIsTailorOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Adaptar Oferta
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
                  className="flex flex-col bg-zinc-950/60 border border-zinc-800/90 hover:border-zinc-700/80 rounded-2xl overflow-hidden transition shadow-sm group"
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
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}
                          >
                            <Target className="w-3 h-3" />
                            <span>ATS {latest.ats_score}%</span>
                          </div>
                        )}
                      </div>

                      {/* Main Role Title */}
                      <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-400 transition flex items-center justify-between">
                        <span className="truncate">{group.role}</span>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition shrink-0 ml-1" />
                      </h3>

                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                        Candidato: {latest.full_name}
                      </p>
                    </div>

                    {/* Metadata footer inside card */}
                    <div className="pt-4 mt-4 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span>{formatDate(latest.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {latest.lang}
                        </span>
                        <span className="capitalize font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {latest.theme}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="px-5 py-2.5 bg-zinc-900/40 border-t border-zinc-900 flex items-center justify-between text-xs">
                    <button
                      onClick={(e) => handleOpenPreview(latest.id, e)}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition text-[11px]"
                      title="Previsualizar CV en grande"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    {group.history.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(group.key);
                        }}
                        className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition text-[11px] font-mono"
                      >
                        <GitBranch className="w-3 h-3 text-zinc-500" />
                        <span>{group.history.length + 1} v.</span>
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
                    <div className="bg-zinc-950 border-t border-zinc-900 p-3 space-y-1.5 text-xs font-mono">
                      <div className="text-[10px] uppercase text-zinc-500 px-2 py-0.5 font-semibold">
                        Versiones anteriores
                      </div>
                      {group.history.map((hSnap) => (
                        <div
                          key={hSnap.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900/80 transition group/item"
                        >
                          <div
                            onClick={() => handleOpenDraft(hSnap)}
                            className="flex-1 cursor-pointer flex flex-col"
                          >
                            <span className="text-[11px] text-zinc-300 font-sans group-hover/item:text-emerald-400 transition">
                              {formatDate(hSnap.created_at)}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {hSnap.id} {hSnap.parent_id ? `← ${hSnap.parent_id}` : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleOpenPreview(hSnap.id, e)}
                              className="p-1 hover:text-zinc-200 text-zinc-500 transition"
                              title="Previsualizar esta versión"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDraft(hSnap)}
                              className="p-1 hover:text-emerald-400 text-zinc-500 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="h-14 px-6 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/40">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    {previewSnapshot.role || "CV Base"} · {previewSnapshot.company || "General"}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {previewSnapshot.id}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {formatDate(previewSnapshot.created_at)} · SHA256: {previewSnapshot.pdf_sha256.slice(0, 10)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const snap = previewSnapshot;
                    setPreviewSnapshot(null);
                    handleOpenDraft(snap as unknown as SnapshotSummary);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Editar versión</span>
                </button>
                <button
                  onClick={() => setPreviewSnapshot(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Modal Body: CV Typst SVG preview */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              <CvPreview svg={previewSvg} loading={previewLoading} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
