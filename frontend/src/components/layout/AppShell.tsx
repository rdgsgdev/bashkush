import { ReactNode } from 'react';
import { BurgerMenu } from './BurgerMenu';
import { SideNav } from './SideNav';
import { DesktopPanel } from './DesktopPanel';
import { SyncBanner } from '../common/SyncBanner';

/**
 * Coque applicative responsive :
 * - mobile : colonne unique (max 480px) + drawer burger ;
 * - desktop (≥ 1024px) : menu latéral gauche permanent (repliable) + contenu
 *   central scrollable + side panel droit pour les modales.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-container flex flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
        <SyncBanner />
        {/* Burger mobile : injoignable sur desktop (bouton masqué dans le Header). */}
        <BurgerMenu />
        {children}
      </div>
      <DesktopPanel />
    </div>
  );
}
