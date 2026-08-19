import { ReactNode, TouchEvent, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { hapticFeedback } from '../../lib/dnd';

/** Traction nécessaire pour armer le refresh (icône entièrement révélée). */
const THRESHOLD = 64;
/** Traction max affichée, même si le doigt continue de descendre. */
const MAX_PULL = 110;
/** Résistance : 2px de doigt ≈ 1px de décalage. */
const RESISTANCE = 0.5;
/** Position maintenue pendant le refresh (icône visible + marge). */
const REFRESH_PULL = 56;
/** Durée des animations de retour. */
const SETTLE_MS = 300;
/** Affichage minimum du refresh, même si les données arrivent vite. */
const MIN_REFRESH_MS = 500;

interface PullToRefreshProps {
  /** Clés de requête (préfixes) à invalider lors du refresh. */
  queryKeys: readonly (readonly unknown[])[];
  children: ReactNode;
}

/**
 * Tirer-vers-le-bas pour rafraîchir, à la iOS : le contenu sous le Header
 * descend en révélant une icône de refresh ; relâché au-delà du seuil, les
 * requêtes données sont invalidées (refetch en arrière-plan, sans recharger
 * la page). Sinon le contenu remonte et rien ne se passe.
 *
 * Le geste n'est actif qu'en haut de scroll (scrollY ≤ 0) et ignore les
 * balayages horizontaux (carrousels), le multi-touch et les touches hors
 * conteneur (modales/burger : portals sur document.body).
 */
export function PullToRefresh({ queryKeys, children }: PullToRefreshProps) {
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [settling, setSettling] = useState(false);

  const startY = useRef<number | null>(null);
  const startX = useRef(0);
  const horizontal = useRef(false);
  const armed = useRef(false);
  const settleTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const settleBack = () => {
    setSettling(true);
    setPull(0);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setSettling(false), SETTLE_MS);
  };

  const doRefresh = async () => {
    setRefreshing(true);
    setPull(REFRESH_PULL);
    try {
      // invalidateQueries attend la fin des refetch des requêtes actives.
      await Promise.all([
        Promise.all(queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))),
        new Promise((r) => setTimeout(r, MIN_REFRESH_MS)),
      ]);
    } finally {
      setRefreshing(false);
      settleBack();
    }
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (refreshing || e.touches.length !== 1) return;
    // Une nouvelle traction interrompt l'animation de retour en cours.
    if (settling) {
      window.clearTimeout(settleTimer.current);
      setSettling(false);
    }
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    horizontal.current = false;
    armed.current = false;
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (startY.current === null || refreshing) return;
    const touch = e.touches[0];
    const dy = touch.clientY - startY.current;
    const dx = touch.clientX - startX.current;

    // Balayage majoritairement horizontal (carrousel, chips) → on ignore.
    if (!horizontal.current && Math.abs(dx) > Math.abs(dy) + 4) {
      horizontal.current = true;
      setPull(0);
      return;
    }
    if (horizontal.current) return;

    // Le scroll natif a pris le dessus → on rend la main.
    if (window.scrollY > 0) {
      startY.current = null;
      setPull(0);
      return;
    }
    // Doigt remonté : contenu ramené au repos (on continue de suivre).
    if (dy <= 0) {
      armed.current = false;
      setPull(0);
      return;
    }

    const next = Math.min(dy * RESISTANCE, MAX_PULL);
    if (next >= THRESHOLD && !armed.current) {
      armed.current = true;
      hapticFeedback(10);
    } else if (next < THRESHOLD) {
      armed.current = false;
    }
    setPull(next);
  };

  const onTouchEnd = () => {
    if (startY.current === null) return;
    startY.current = null;
    if (refreshing) return;
    if (pull >= THRESHOLD) void doRefresh();
    else settleBack();
  };

  const armedNow = pull >= THRESHOLD;
  const progress = Math.min(pull / THRESHOLD, 1);
  // Transform appliqué seulement quand nécessaire : à l'état de repos, pas
  // de containing block pour les éventuels éléments fixes (DragOverlay).
  const transformed = pull > 0 || settling || refreshing;
  const animating = settling || refreshing;

  return (
    <div
      className="relative flex flex-1 flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* Indicateur : collé au dessus du bord du contenu, révélé dans
          l'espace qui s'ouvre sous le Header pendant la traction. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-center"
        style={{ transform: `translateY(calc(-100% + ${pull}px))` }}
      >
        <span
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card"
          style={{ opacity: Math.min(pull / 20, 1) }}
        >
          <RefreshCw
            className={cn(
              'h-5 w-5 transition-colors',
              armedNow || refreshing ? 'text-brand-500' : 'text-stone-400',
              refreshing && 'animate-spin',
            )}
            style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
          />
        </span>
      </div>

      <div
        className="flex flex-1 flex-col"
        style={
          transformed
            ? {
                transform: `translateY(${pull}px)`,
                transition: animating ? `transform ${SETTLE_MS}ms cubic-bezier(0.2, 0, 0.4, 1)` : undefined,
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
