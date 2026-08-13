import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, parseDate, toDateInputValue, todayValue } from '../../lib/utils';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

interface CalendarProps {
  /** Jour actif / sélectionné (YYYY-MM-DD). */
  activeDate: string;
  /** Appelé UNIQUEMENT au clic sur un jour (pas au changement de mois). */
  onSelectDate: (date: string) => void;
  /** Jours disposant d'au moins un plat planifié (YYYY-MM-DD). */
  plannedDays?: Set<string>;
  /** Compact (page d'accueil). */
  compact?: boolean;
  /** Appelé quand le mois affiché change (pour recharger les pastilles). */
  onViewMonthChange?: (range: { year: number; month: number; from: string; to: string }) => void;
}

function monthRange(year: number, month: number) {
  const from = toDateInputValue(new Date(year, month, 1));
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = toDateInputValue(new Date(year, month, lastDay));
  return { year, month, from, to };
}

export function Calendar({ activeDate, onSelectDate, plannedDays, compact, onViewMonthChange }: CalendarProps) {
  // Mois affiché (indépendant du jour actif : la navigation ne change pas activeDate).
  const initial = parseDate(activeDate);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  // Sync le mois affiché si activeDate change depuis l'extérieur (ex: URL).
  useEffect(() => {
    const d = parseDate(activeDate);
    if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate]);

  // Notifie le parent du mois affiché (pour qu'il recharge les pastilles).
  useEffect(() => {
    onViewMonthChange?.(monthRange(viewYear, viewMonth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Lundi = 0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: ({ day: number; date: string } | null)[] = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push({ day: d, date: toDateInputValue(new Date(viewYear, viewMonth, d)) });
    }
    return arr;
  }, [viewYear, viewMonth]);

  const today = todayValue();

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const headerSize = compact ? 'text-sm' : 'text-base';

  return (
    <div className="rounded-2xl bg-white p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className={cn('font-bold capitalize text-stone-800', headerSize)}>
          {MONTHS[viewMonth]} {viewYear}
        </p>
        <button
          onClick={() => changeMonth(1)}
          className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-1 text-xs font-semibold text-stone-400">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const isToday = cell.date === today;
          const isActive = cell.date === activeDate;
          const hasPlan = plannedDays?.has(cell.date) ?? false;
          return (
            <button
              key={i}
              onClick={() => onSelectDate(cell.date)}
              className={cn(
                'relative mx-auto flex aspect-square w-9 items-center justify-center rounded-full text-sm transition',
                isActive
                  ? 'bg-brand-500 font-bold text-white'
                  : isToday
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-stone-700 hover:bg-stone-100',
              )}
            >
              {cell.day}
              {hasPlan && (
                <span
                  className={cn(
                    'absolute bottom-1 h-1 w-1 rounded-full',
                    isActive ? 'bg-white' : 'bg-brand-500',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
