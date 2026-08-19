import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  burgerOpen: boolean;
  openBurger: () => void;
  closeBurger: () => void;
  toggleBurger: () => void;
  /** Menu latéral desktop replié (icônes seules) — persisté en cache. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      burgerOpen: false,
      openBurger: () => set({ burgerOpen: true }),
      closeBurger: () => set({ burgerOpen: false }),
      toggleBurger: () => set((s) => ({ burgerOpen: !s.burgerOpen })),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'bashkush-ui',
      // Seul l'état replié du menu latéral est persisté (le burger est transitoire).
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
