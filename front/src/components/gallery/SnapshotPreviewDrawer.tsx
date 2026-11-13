import React from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Snapshot } from "@/types/cv";
import { CvPreview } from "@/components/preview/CvPreview";
import { formatDate } from "./snapshotGrouping";

export interface SnapshotPreviewDrawerProps {
  snapshot: Snapshot | null;
  svg: string;
  loading: boolean;
  onClose: () => void;
  onEdit: (snapshot: Snapshot) => void;
}

export function SnapshotPreviewDrawer({
  snapshot,
  svg,
  loading,
  onClose,
  onEdit,
}: SnapshotPreviewDrawerProps) {
  if (!snapshot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/85 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-4xl h-[90vh] bg-surface border border-hairline rounded-xl shadow-lg flex flex-col overflow-hidden">
        <div className="h-12 px-5 border-b border-hairline flex items-center justify-between shrink-0 bg-surface-raised">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-text-muted" />
            <div>
              <h3 className="font-display text-sm text-text-ivory font-medium flex items-center gap-1.5">
                <span>
                  {snapshot.role || "CV Base"} · {snapshot.company || "General"}
                </span>
                <span className="text-[11px] font-mono text-text-muted font-normal">
                  ({snapshot.id})
                </span>
              </h3>
              <p className="text-[10px] font-mono text-text-muted tabular-nums">
                {formatDate(snapshot.created_at)} · {snapshot.pdf_sha256.slice(0, 10)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(snapshot)}
              className="btn-accent flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Editar versión</span>
            </button>
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-hidden flex flex-col bg-canvas">
          <CvPreview svg={svg} loading={loading} />
        </div>
      </div>
    </div>
  );
}
