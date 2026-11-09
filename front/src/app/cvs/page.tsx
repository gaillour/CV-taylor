"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  Eye,
  ExternalLink,
  Loader2,
  AlertCircle,
  GitBranch,
  SlidersHorizontal,
  Trash2,
  Search,
} from "lucide-react";
import { API_BASE_URL, useCvStore } from "@/store/useCvStore";
import { apiFetch } from "@/lib/api";
import { isProfileEmpty, useProfileStore } from "@/store/useProfileStore";
import { Snapshot, SnapshotSummary } from "@/types/cv";
import { TailorModal } from "@/components/tailor/TailorModal";
import { CvPreview } from "@/components/preview/CvPreview";
import { confirmDialog } from "@/store/useConfirmStore";
import { toast } from "@/store/useToastStore";

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
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Adaptar / Tailor
  const [isTailorOpen, setIsTailorOpen] = useState(false);

  // History expanded state per group
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Preview modal state
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

  // Filtrado por búsqueda
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.company.toLowerCase().includes(q) ||
        g.role.toLowerCase().includes(q) ||
        g.latest.full_name.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  const toggleGroup = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenDraft = async (snapSummary: SnapshotSummary) => {
    if (dirty) {
      const ok = await confirmDialog({
        title: "¿Descartar cambios?",
        message: "Tenés cambios sin guardar en el borrador actual. Si continuás, se descartarán.",
        confirmText: "Descartar",
        variant: "warning",
      });
      if (!ok) return;
    }

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/snapshots/${snapSummary.id}`);
      if (!res.ok) throw new Error("No se pudo obtener el snapshot");
      const fullSnap: Snapshot = await res.json();
      loadSnapshotDraft(fullSnap);
      router.push(`/editor/${fullSnap.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al abrir CV");
    }
  };

  const handleNewBaseCv = async () => {
    if (profileEmpty) {
      router.push("/perfil");
      return;
    }
    if (dirty) {
      const ok = await confirmDialog({
        title: "¿Descartar cambios?",
        message: "Tenés cambios sin guardar en el borrador actual. Si continuás, se descartarán.",
        confirmText: "Descartar",
        variant: "warning",
      });
      if (!ok) return;
    }
    await startBaseDraft();
    router.push("/editor/nuevo");
  };

  const handleTailorClick = async () => {
    if (profileEmpty) {
      router.push("/perfil");
      return;
    }
    if (dirty) {
      const ok = await confirmDialog({
        title: "¿Descartar cambios?",
        message: "Tenés cambios sin guardar en el borrador actual. Si continuás, se descartarán para adaptar una nueva versión.",
        confirmText: "Descartar",
        variant: "warning",
      });
      if (!ok) return;
    }
    setIsTailorOpen(true);
  };

  const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmDialog({
      title: "¿Archivar versión?",
      message: "Esta versión se quitará del archivo activo. Podrás seguir consultando el linaje histórico si es necesario.",
      confirmText: "Archivar",
      variant: "danger",
    });
    if (!ok) return;

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
      toast.success("Versión archivada correctamente");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar versión");
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
      toast.error(err instanceof Error ? err.message : "Error al previsualizar snapshot");
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
      <div className="flex-1 flex flex-col min-h-0 bg-canvas text-text-primary items-center justify-center py-24 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <p className="text-xs text-text-muted font-mono">Cargando archivo de versiones...</p>
      </div>
    );
  }

  if (profileEmpty && snapshots.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-canvas text-text-primary items-center justify-center py-24 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <p className="text-xs text-text-muted font-mono">Redirigiendo a perfil...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas text-text-primary overflow-y-auto">
      {/* Header editorial */}
      <div className="max-w-6xl w-full mx-auto px-6 pt-8 pb-6 border-b border-hairline">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-text-ivory font-medium tracking-tight">
              Versiones guardadas
              <span className="text-sm font-mono text-text-muted font-normal ml-2.5">
                ({snapshots.length})
              </span>
            </h1>
            <p className="text-xs text-text-secondary mt-1.5 max-w-xl">
              Registro longitudinal de variantes adaptadas a ofertas laborales y compiladas en Typst.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleNewBaseCv}
              className="btn-secondary flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              title="Crear un borrador de CV en blanco"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>CV en blanco</span>
            </button>

            <button
              onClick={handleTailorClick}
              className="btn-accent flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Adaptar a oferta</span>
            </button>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtro */}
        {snapshots.length > 0 && (
          <div className="mt-6 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por empresa, cargo o variante..."
                className="w-full bg-surface/70 border border-hairline rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus-ring font-mono"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer font-mono"
              >
                Limpiar filtro
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl w-full mx-auto px-6 py-6 flex-1">
        {error ? (
          <div className="p-4 rounded-xl bg-danger-subtle border border-danger-border text-danger text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-basting rounded-2xl bg-surface/30 p-8 max-w-lg mx-auto">
            <div className="w-10 h-10 rounded-full bg-surface-raised border border-hairline flex items-center justify-center text-accent mb-3">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-display text-base text-text-ivory font-medium">
              El archivo está vacío
            </h3>
            <p className="text-xs text-text-secondary mt-1.5 mb-6">
              Empezá con un CV base o adaptá tu perfil a una oferta de trabajo para compilar la primera versión en Typst.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewBaseCv}
                className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              >
                Abrir CV base
              </button>
              <button
                onClick={handleTailorClick}
                className="btn-accent px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              >
                Adaptar a oferta
              </button>
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-xs font-mono">
            No se encontraron versiones para &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          /* Registro Longitudinal (Ledger List) */
          <div className="border border-hairline rounded-xl bg-surface/40 overflow-hidden divide-y divide-hairline">
            {/* Cabecera de columnas sutil */}
            <div className="hidden md:grid md:grid-cols-12 px-6 py-3 bg-surface text-[11px] font-mono text-text-muted select-none">
              <div className="col-span-5">Destino & Rol</div>
              <div className="col-span-2">Ajuste ATS</div>
              <div className="col-span-2">Variante</div>
              <div className="col-span-2">Última edición</div>
              <div className="col-span-1 text-right">Acciones</div>
            </div>

            {/* Filas de Versiones */}
            {filteredGroups.map((group) => {
              const isExpanded = !!expandedGroups[group.key];
              const latest = group.latest;
              const hasHistory = group.history.length > 0;

              return (
                <div key={group.key} className="transition-colors">
                  {/* Fila Principal */}
                  <div
                    onClick={() => handleOpenDraft(latest)}
                    className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-0 hover:bg-surface-raised/40 cursor-pointer group transition-colors"
                  >
                    {/* Columna Empresa y Rol */}
                    <div className="col-span-5 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-ivory group-hover:text-accent transition-colors truncate">
                          {group.company}
                        </span>
                        {hasHistory && (
                          <button
                            type="button"
                            onClick={(e) => toggleGroup(group.key, e)}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-surface transition-colors cursor-pointer"
                            title="Ver versiones previas"
                          >
                            <GitBranch className="w-3 h-3 text-text-muted" />
                            <span>+{group.history.length}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary truncate mt-0.5 font-mono">
                        {group.role}
                      </p>
                    </div>

                    {/* Columna Score ATS */}
                    <div className="col-span-2">
                      {latest.ats_score !== null ? (
                        <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              latest.ats_score >= 85
                                ? "bg-green-text"
                                : latest.ats_score >= 70
                                ? "bg-warning"
                                : "bg-text-muted"
                            }`}
                          />
                          <span
                            className={
                              latest.ats_score >= 85
                                ? "text-green-text font-medium"
                                : latest.ats_score >= 70
                                ? "text-warning font-medium"
                                : "text-text-secondary"
                            }
                          >
                            ATS {latest.ats_score}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-text-muted">— Base</span>
                      )}
                    </div>

                    {/* Columna Variante (Idioma / Tema) */}
                    <div className="col-span-2 text-xs font-mono text-text-muted">
                      <span className="uppercase text-text-secondary">{latest.lang}</span>
                      <span className="mx-1 text-text-muted/60">·</span>
                      <span className="capitalize">{latest.theme}</span>
                    </div>

                    {/* Columna Fecha */}
                    <div className="col-span-2 text-xs font-mono text-text-muted tabular-nums">
                      {formatDate(latest.created_at)}
                    </div>

                    {/* Columna Acciones */}
                    <div className="col-span-1 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleOpenPreview(latest.id, e)}
                        className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
                        title="Previsualizar documento"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSnapshot(latest.id, e)}
                        className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
                        title="Archivar versión"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Linaje histórico (Sub-filas de versiones previas) */}
                  {isExpanded && hasHistory && (
                    <div className="bg-surface/50 border-t border-hairline/60 pl-8 pr-6 py-2 divide-y divide-hairline/40">
                      {group.history.map((hSnap) => (
                        <div
                          key={hSnap.id}
                          onClick={() => handleOpenDraft(hSnap)}
                          className="py-2.5 grid grid-cols-1 md:grid-cols-12 items-center text-xs font-mono hover:bg-surface-raised/30 transition-colors cursor-pointer group/history"
                        >
                          <div className="col-span-5 flex items-center gap-2 pl-2">
                            <span className="text-text-muted text-[10px]">↳</span>
                            <span className="text-text-secondary group-hover/history:text-text-ivory transition-colors">
                              {hSnap.role}
                            </span>
                            <span className="text-[10px] text-text-muted font-mono">
                              ({hSnap.id})
                            </span>
                          </div>
                          <div className="col-span-2">
                            {hSnap.ats_score !== null ? (
                              <span className="text-text-muted tabular-nums">
                                ATS {hSnap.ats_score}%
                              </span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </div>
                          <div className="col-span-2 text-text-muted">
                            <span className="uppercase">{hSnap.lang}</span> · {hSnap.theme}
                          </div>
                          <div className="col-span-2 text-text-muted tabular-nums">
                            {formatDate(hSnap.created_at)}
                          </div>
                          <div className="col-span-1 flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleOpenPreview(hSnap.id, e)}
                              className="p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                              title="Previsualizar"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSnapshot(hSnap.id, e)}
                              className="p-1 text-text-muted hover:text-danger transition-colors cursor-pointer"
                              title="Archivar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal Tailor */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/85 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="relative w-full max-w-4xl h-[90vh] bg-surface border border-hairline rounded-xl shadow-lg flex flex-col overflow-hidden">
            <div className="h-12 px-5 border-b border-hairline flex items-center justify-between shrink-0 bg-surface-raised">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-text-muted" />
                <div>
                  <h3 className="font-display text-sm text-text-ivory font-medium flex items-center gap-1.5">
                    <span>{previewSnapshot.role || "CV Base"} · {previewSnapshot.company || "General"}</span>
                    <span className="text-[11px] font-mono text-text-muted font-normal">
                      ({previewSnapshot.id})
                    </span>
                  </h3>
                  <p className="text-[10px] font-mono text-text-muted tabular-nums">
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
                  className="btn-accent flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Editar versión</span>
                </button>
                <button
                  onClick={() => setPreviewSnapshot(null)}
                  className="px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-hidden flex flex-col bg-canvas">
              <CvPreview svg={previewSvg} loading={previewLoading} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
