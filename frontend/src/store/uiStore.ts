import { create } from 'zustand';

interface UiState {
  burgerOpen: boolean;
  openBurger: () => void;
  closeBurger: () => void;
  toggleBurger: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  burgerOpen: false,
  openBurger: () => set({ burgerOpen: true }),
  closeBurger: () => set({ burgerOpen: false }),
  toggleBurger: () => set((s) => ({ burgerOpen: !s.burgerOpen })),
}));
