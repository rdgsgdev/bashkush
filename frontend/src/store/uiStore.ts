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
  /** Aperçu courses de la homepage : liste complète affichée. Volontairement
      non persisté (mémoire de session uniquement) — survit à la mise en
      background de l'app mais est réinitialisé si l'app est fermée. */
  groceryPreviewExpanded: boolean;
  expandGroceryPreview: () => void;
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
      groceryPreviewExpanded: false,
      expandGroceryPreview: () => set({ groceryPreviewExpanded: true }),
    }),
    {
      name: 'bashkush-ui',
      // Seul l'état replié du menu latéral est persisté (le burger et
      // l'aperçu courses étendu sont transitoires, mémoire de session).
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
