import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Meal } from '../../types';
import { MealCard } from './MealCard';
import { useMeals } from '../../api/meals';
import { FullScreenLoader } from '../ui/Feedback';

/* --- Physique du défilement tactile (drag + inertie + snap) --- */

/** Vitesse de relâcher minimale (px/ms) : en dessous, pas d'inertie, on se
 *  cale directement sur la carte la plus proche. */
const FLING_MIN = 0.05;
/** Vitesse de relâcher maximale (px/ms) : une impulsion très forte reste contrôlée. */
const FLING_MAX = 2.8;
/** Multiplicateur d'élan appliqué à la vitesse mesurée au relâcher. */
const FLING_BOOST = 1.2;
/** Décroissance exponentielle de la vitesse pendant l'inertie (ms) — feeling iOS. */
const FRICTION_TAU = 280;
/** Fenêtre de mesure de la vitesse (ms) : seuls les derniers mouvements comptent. */
const VELOCITY_WINDOW = 100;
/** Durée du retour animé sur la carte la plus proche une fois l'élan épuisé. */
const SETTLE_MS = 240;
/** Inactivité molette/trackpad avant de se caler sur une carte (desktop). */
const WHEEL_IDLE_MS = 140;
/** Déplacement minimal (px) avant de verrouiller la direction du geste. */
const DRAG_THRESHOLD = 8;

/** Positions de scroll qui alignent chaque carte à gauche, comme la première. */
const snapPoints = (el: HTMLElement) => {
  const kids = Array.from(el.children) as HTMLElement[];
  const base = kids[0]?.offsetLeft ?? 0;
  return kids.map((k) => k.offsetLeft - base);
};

const nearestPoint = (pos: number, points: number[]) => {
  let best = points[0] ?? 0;
  for (const p of points) if (Math.abs(p - pos) < Math.abs(best - pos)) best = p;
  return best;
};

interface MealCarouselProps {
  /** Repas sélectionné (pour le surlignage). */
  selectedId?: string;
  onSelect?: (meal: Meal) => void;
  /** Affiche une tuile « Ajouter un plat » en première position (ex: accueil). */
  onAdd?: () => void;
  /** Plat vers lequel défiler automatiquement (ex: planification ouverte depuis
   *  la fiche d'un plat). Dérivé des props du parent — donc correct dès le
   *  premier rendu, contrairement au state synchronisé par effet. */
  scrollToId?: string;
}

/**
 * Carrousel horizontal des plats (favoris en tête). Sur mobile, le drag est
 * personnalisé : au relâcher, l'élan mesuré poursuit le défilement tout seul
 * (frottement exponentiel façon iOS) puis le carrousel se cale sur la carte
 * la plus proche. Le scroll-snap natif « mandatory » bride en effet l'élan
 * sur iOS (une flick forte n'atteint que la carte suivante), d'où ce moteur.
 */
export function MealCarousel({ selectedId, onSelect, onAdd, scrollToId }: MealCarouselProps) {
  const { data: meals, isLoading } = useMeals();
  const ref = useRef<HTMLDivElement>(null);
  /** Permet aux scrolls programmatiques (boutons, scrollToId) d'interrompre
   *  l'inertie en cours. */
  const stopInertia = useRef<() => void>(() => {});

  // Défile jusqu'au plat demandé dès qu'il est rendu (les plats peuvent
  // arriver après le montage si la requête est en cours). Une seule fois par
  // valeur : la sélection manuelle d'un autre plat n'est jamais perturbée.
  // Le ref se réinitialise à chaque réouverture (la modale démonte son contenu).
  const lastScrolledTo = useRef<string | null>(null);
  useEffect(() => {
    if (!scrollToId || lastScrolledTo.current === scrollToId || !meals?.length) return;
    const el = ref.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const idx = kids.findIndex((k) => k.dataset.mealId === scrollToId);
    if (idx === -1) return;
    lastScrolledTo.current = scrollToId;
    stopInertia.current();
    el.scrollTo({ left: snapPoints(el)[idx], behavior: 'auto' });
  }, [scrollToId, meals]);

  // Moteur tactile. Listeners natifs car React déclare les touchmove en
  // passif — impossible d'y appeler preventDefault pour capturer le drag.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let wheelTimer = 0;
    let touchId: number | null = null;
    let dragging = false; // geste verrouillé à l'horizontal : le drag nous appartient
    let aborted = false; // geste vertical : on laisse le scroll natif de la page
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let samples: { x: number; t: number }[] = [];

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    stopInertia.current = stop;

    /** Retour animé (ease-out) sur une position de snap. */
    const settle = (target: number) => {
      const from = el.scrollLeft;
      const dist = target - from;
      if (Math.abs(dist) < 1) return;
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / SETTLE_MS);
        el.scrollLeft = from + dist * (1 - Math.pow(1 - p, 3));
        raf = p < 1 ? requestAnimationFrame(step) : 0;
      };
      raf = requestAnimationFrame(step);
    };

    /** Glisse d'inertie après le relâcher : la vitesse décroît de façon
     *  exponentielle, puis le carrousel se cale sur la carte la plus proche
     *  (ou s'arrête net au bord du contenu). */
    const glide = (v0: number) => {
      let v = v0;
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(64, now - last);
        last = now;
        v *= Math.exp(-dt / FRICTION_TAU);
        const max = Math.max(0, el.scrollWidth - el.clientWidth);
        const pos = Math.min(max, Math.max(0, el.scrollLeft + v * dt));
        const hitEdge = pos === 0 || pos === max;
        el.scrollLeft = pos;
        if (hitEdge || Math.abs(v) < FLING_MIN / 2) {
          settle(nearestPoint(pos, snapPoints(el)));
          return;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        // Multi-touch : on abandonne le drag custom pour ce geste.
        stop();
        touchId = null;
        dragging = false;
        return;
      }
      stop(); // un nouveau toucher interrompt l'inertie en cours
      const t = e.touches[0];
      touchId = t.identifier;
      startX = t.clientX;
      startY = t.clientY;
      startScroll = el.scrollLeft;
      dragging = false;
      aborted = false;
      samples = [{ x: t.clientX, t: performance.now() }];
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchId === null || aborted) return;
      const t = Array.from(e.touches).find((x) => x.identifier === touchId);
      if (!t) return;
      if (!dragging) {
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        // Verrouillage directionnel : vertical → scroll natif de la page.
        if (Math.abs(dy) > DRAG_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
          aborted = true;
          return;
        }
        if (Math.abs(dx) <= DRAG_THRESHOLD) return;
        dragging = true;
        // Le natif a pu consommer quelques px avant le verrouillage : on
        // repart de la position actuelle pour éviter un saut.
        startScroll = el.scrollLeft;
        startX = t.clientX;
      }
      if (e.cancelable) e.preventDefault();
      el.scrollLeft = startScroll - (t.clientX - startX);
      const now = performance.now();
      samples.push({ x: t.clientX, t: now });
      while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW) samples.shift();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchId === null) return;
      if (!Array.from(e.changedTouches).some((x) => x.identifier === touchId)) return;
      touchId = null;
      if (!dragging) return; // simple tap → click natif sur la carte
      dragging = false;
      // Vitesse mesurée sur la fenêtre récente (~100 ms). Doigt vers la
      // droite → le contenu défile vers la gauche : vitesse inversée.
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last.t - first.t;
      const v = dt > 0 ? (-(last.x - first.x) / dt) * FLING_BOOST : 0;
      const clamped = Math.max(-FLING_MAX, Math.min(FLING_MAX, v));
      if (Math.abs(clamped) >= FLING_MIN) glide(clamped);
      else settle(nearestPoint(el.scrollLeft, snapPoints(el)));
    };

    // Desktop : après un scroll molette/trackpad, on se cale sur une carte.
    const onWheel = () => {
      stop();
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        settle(nearestPoint(el.scrollLeft, snapPoints(el)));
      }, WHEEL_IDLE_MS);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      stop();
      window.clearTimeout(wheelTimer);
      stopInertia.current = () => {};
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
    };
    // Le conteneur n'existe pas pendant le chargement : on réattache ensuite.
  }, [isLoading]);

  const scrollBy = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    stopInertia.current();
    // D'une carte à l'autre (et non d'un pas fixe) : on retombe toujours aligné.
    const points = snapPoints(el);
    if (points.length === 0) return;
    let i = 0;
    points.forEach((p, idx) => {
      if (Math.abs(p - el.scrollLeft) < Math.abs(points[i] - el.scrollLeft)) i = idx;
    });
    const next = Math.min(points.length - 1, Math.max(0, i + dir));
    el.scrollTo({ left: points[next], behavior: 'smooth' });
  };

  if (isLoading) return <FullScreenLoader />;

  return (
    <div className="relative">
      {/* touch-pan-y : le vertical reste natif (pull-to-refresh, scroll page),
          l'horizontal appartient au moteur tactile ci-dessus. */}
      <div
        ref={ref}
        className="scrollbar-none flex touch-pan-y gap-3 overflow-x-auto overscroll-x-contain px-1 py-2"
      >
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex min-h-52 w-44 shrink-0 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 text-brand-600 shadow-card transition active:scale-[0.98]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">Ajouter un plat</span>
          </button>
        )}
        {(meals ?? []).map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            layout="carousel"
            selected={selectedId === meal.id}
            onClick={() => onSelect?.(meal)}
          />
        ))}
      </div>

      {(meals?.length ?? 0) > 2 && (
        <>
          <button
            onClick={() => scrollBy(-1)}
            className="absolute left-0 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-soft sm:block"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-soft sm:block"
            aria-label="Suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
