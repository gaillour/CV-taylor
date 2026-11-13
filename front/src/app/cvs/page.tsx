"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  Search,
} from "lucide-react";
import { API_BASE_URL, useCvStore } from "@/store/useCvStore";
import { apiFetch } from "@/lib/api";
import { isProfileEmpty, useProfileStore } from "@/store/useProfileStore";
import { Snapshot, SnapshotSummary } from "@/types/cv";
import { TailorModal } from "@/components/tailor/TailorModal";
import { confirmDialog } from "@/store/useConfirmStore";
import { toast } from "@/store/useToastStore";
import { groupSnapshotsByLineage } from "@/components/gallery/snapshotGrouping";
import { SnapshotGroupCard } from "@/components/gallery/SnapshotGroupCard";
import { SnapshotPreviewDrawer } from "@/components/gallery/SnapshotPreviewDrawer";

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
  const groups = useMemo(() => groupSnapshotsByLineage(snapshots), [snapshots]);

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
            {filteredGroups.map((group) => (
              <SnapshotGroupCard
                key={group.key}
                group={group}
                isExpanded={!!expandedGroups[group.key]}
                onToggleExpand={(e) => toggleGroup(group.key, e)}
                onOpenDraft={handleOpenDraft}
                onOpenPreview={handleOpenPreview}
                onDeleteSnapshot={handleDeleteSnapshot}
              />
            ))}
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
      <SnapshotPreviewDrawer
        snapshot={previewSnapshot}
        svg={previewSvg}
        loading={previewLoading}
        onClose={() => setPreviewSnapshot(null)}
        onEdit={(snap) => {
          setPreviewSnapshot(null);
          handleOpenDraft(snap as unknown as SnapshotSummary);
        }}
      />
    </div>
  );
}
