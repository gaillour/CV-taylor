import { Profile, ThemeName } from "@/types/cv";

export const DRAFT_STORAGE_KEY = "cvt_anonymous_draft_v1";
export const PENDING_ACTION_STORAGE_KEY = "cvt_pending_action_v1";

export type PendingActionType = "save" | "tailor";

export interface PendingAction {
  action: PendingActionType;
  role?: string;
  jobSpec?: string;
  createdAt: string;
}

export interface LocalDraft {
  profile: Profile;
  theme?: ThemeName;
  updatedAt: string;
}

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveDraft(profile: Profile, theme?: ThemeName): void {
  if (!isStorageAvailable()) return;
  try {
    const draft: LocalDraft = {
      profile,
      theme,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error("Error al guardar borrador en localStorage:", error);
  }
}

export function loadDraft(): LocalDraft | null {
  if (!isStorageAvailable()) return null;
  try {
    const item = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!item) return null;
    return JSON.parse(item) as LocalDraft;
  } catch (error) {
    console.error("Error al leer borrador de localStorage:", error);
    return null;
  }
}

export function hasDraft(): boolean {
  if (!isStorageAvailable()) return false;
  return window.localStorage.getItem(DRAFT_STORAGE_KEY) !== null;
}

export function clearDraft(): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.error("Error al limpiar borrador de localStorage:", error);
  }
}

export function setPendingAction(payload: PendingAction): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(PENDING_ACTION_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Error al guardar acción pendiente en localStorage:", error);
  }
}

export function savePendingAction(action: PendingActionType, extra?: { role?: string; jobSpec?: string }): void {
  setPendingAction({
    action,
    role: extra?.role,
    jobSpec: extra?.jobSpec,
    createdAt: new Date().toISOString(),
  });
}

export function loadPendingAction(): PendingAction | null {
  if (!isStorageAvailable()) return null;
  try {
    const item = window.localStorage.getItem(PENDING_ACTION_STORAGE_KEY);
    if (!item) return null;
    return JSON.parse(item) as PendingAction;
  } catch (error) {
    console.error("Error al leer acción pendiente de localStorage:", error);
    return null;
  }
}

export function clearPendingAction(): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(PENDING_ACTION_STORAGE_KEY);
  } catch (error) {
    console.error("Error al limpiar acción pendiente de localStorage:", error);
  }
}

export const getPendingAction = loadPendingAction;

