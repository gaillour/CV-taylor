import { create } from "zustand";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolver: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: { message: "" },
  resolver: null,
  confirm: (options) => {
    const opts: ConfirmOptions =
      typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options: opts,
        resolver: resolve,
      });
    });
  },
  handleConfirm: () => {
    const { resolver } = get();
    if (resolver) resolver(true);
    set({ isOpen: false, resolver: null });
  },
  handleCancel: () => {
    const { resolver } = get();
    if (resolver) resolver(false);
    set({ isOpen: false, resolver: null });
  },
}));

export const confirmDialog = (options: ConfirmOptions | string) =>
  useConfirmStore.getState().confirm(options);
