import { create } from "zustand";

interface PaywallState {
  isOpen: boolean;
  reason?: string;
  openPaywall: (reason?: string) => void;
  closePaywall: () => void;
}

export const usePaywallStore = create<PaywallState>((set) => ({
  isOpen: false,
  reason: undefined,
  openPaywall: (reason?: string) => set({ isOpen: true, reason }),
  closePaywall: () => set({ isOpen: false, reason: undefined }),
}));
