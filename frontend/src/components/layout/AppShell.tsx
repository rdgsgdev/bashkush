import { ReactNode } from 'react';
import { BurgerMenu } from './BurgerMenu';
import { SyncBanner } from '../common/SyncBanner';

/** Conteneur mobile-first + drawer burger global. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-container flex flex-col">
      <SyncBanner />
      <BurgerMenu />
      {children}
    </div>
  );
}
