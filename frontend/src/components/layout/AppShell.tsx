import { ReactNode } from 'react';
import { BurgerMenu } from './BurgerMenu';

/** Conteneur mobile-first + drawer burger global. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-container flex flex-col">
      <BurgerMenu />
      {children}
    </div>
  );
}
