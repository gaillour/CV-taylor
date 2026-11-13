import { SnapshotSummary } from "@/types/cv";

export interface SnapshotGroup {
  key: string;
  company: string;
  role: string;
  latest: SnapshotSummary;
  history: SnapshotSummary[];
}

export function groupSnapshotsByLineage(snapshots: SnapshotSummary[]): SnapshotGroup[] {
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
}

export function formatDate(isoStr: string): string {
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
}
