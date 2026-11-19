import { create } from "zustand";

export type ConfirmChoiceResult = "confirm" | "secondary" | "cancel";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  secondaryText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolver: ((value: boolean) => void) | null;
  choiceResolver: ((value: ConfirmChoiceResult) => void) | null;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  confirmChoice: (options: ConfirmOptions) => Promise<ConfirmChoiceResult>;
  handleConfirm: () => void;
  handleSecondary: () => void;
  handleCancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: { message: "" },
  resolver: null,
  choiceResolver: null,
  confirm: (options) => {
    const opts: ConfirmOptions =
      typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options: opts,
        resolver: resolve,
        choiceResolver: null,
      });
    });
  },
  confirmChoice: (options) => {
    return new Promise<ConfirmChoiceResult>((resolve) => {
      set({
        isOpen: true,
        options,
        resolver: null,
        choiceResolver: resolve,
      });
    });
  },
  handleConfirm: () => {
    const { resolver, choiceResolver } = get();
    if (resolver) resolver(true);
    if (choiceResolver) choiceResolver("confirm");
    set({ isOpen: false, resolver: null, choiceResolver: null });
  },
  handleSecondary: () => {
    const { resolver, choiceResolver } = get();
    if (resolver) resolver(false);
    if (choiceResolver) choiceResolver("secondary");
    set({ isOpen: false, resolver: null, choiceResolver: null });
  },
  handleCancel: () => {
    const { resolver, choiceResolver } = get();
    if (resolver) resolver(false);
    if (choiceResolver) choiceResolver("cancel");
    set({ isOpen: false, resolver: null, choiceResolver: null });
  },
}));

export const confirmDialog = (options: ConfirmOptions | string) =>
  useConfirmStore.getState().confirm(options);

export const confirmChoice = (options: ConfirmOptions) =>
  useConfirmStore.getState().confirmChoice(options);
