import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn, parseDate, toDateInputValue, todayValue, formatShortDate } from '../../lib/utils';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

interface DateRangePickerProps {
  /** Sélection confirmée (YYYY-MM-DD). from === to → un seul jour. */
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

/** Nombre de jours d'une plage (inclusive). */
function daysCount(from: string, to: string): number {
  const ms = parseDate(to).getTime() - parseDate(from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Libellé lisible d'une sélection : « 16 août » ou « 16 août → 18 août · 3 jours ». */
function describeRange(from: string, to: string): string {
  if (from === to) return formatShortDate(from);
  return `${formatShortDate(from)} → ${formatShortDate(to)} · ${daysCount(from, to)} jours`;
}

/**
 * Sélecteur de date unique pour la planification :
 * - 1er clic sur un jour → ce jour seul est sélectionné ;
 * - clic sur un 2e jour → toute la plage entre les deux est sélectionnée
 *   (les clics suivants recommencent une nouvelle sélection) ;
 * - la coche ✓ valide : les jours sélectionnés deviennent les jours planifiés.
 */
export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  // Sélection en cours (non confirmée) : start seul = jour unique, start+end = plage.
  const [start, setStart] = useState<string>(from);
  const [end, setEnd] = useState<string>(to);

  const initial = parseDate(from || todayValue());
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  // Resynchronise la sélection en cours sur la sélection confirmée (ouverture
  // de la modale, édition d'un plan existant) sans rebond après validation.
  const lastConfirmed = useMemo(() => `${from}\u0000${to}`, [from, to]);
  useEffect(() => {
    setStart(from);
    setEnd(to);
    const d = parseDate(from || todayValue());
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastConfirmed]);

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
  // Bornes de la sélection en cours ('' = pas encore de 2e jour → jour unique).
  const selFrom = start;
  const selTo = end || start;

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

  const handleDayClick = (date: string) => {
    if (!start || end) {
      // (Re)démarre une sélection : premier clic = jour unique.
      setStart(date);
      setEnd('');
      return;
    }
    // Deuxième clic : plage entre les deux jours (ordre quelconque).
    const a = date < start ? date : start;
    const b = date < start ? start : date;
    setStart(a);
    setEnd(b);
  };

  const openPicker = () => {
    // Repart de la sélection confirmée en cours.
    setStart(from);
    setEnd(to);
    setOpen((v) => !v);
  };

  const confirm = () => {
    if (!start) return;
    onChange(start, end || start);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Champ unique (replié) affichant la sélection confirmée */}
      <button
        type="button"
        onClick={openPicker}
        className="field flex items-center gap-2 text-left"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-stone-400" />
        <span className={cn('flex-1 truncate', !from && 'text-stone-400')}>
          {from ? describeRange(from, to) : 'Choisir une date'}
        </span>
        <ChevronRight
          className={cn('h-4 w-4 shrink-0 text-stone-400 transition', open && 'rotate-90')}
        />
      </button>

      {open && (
        <div className="rounded-2xl bg-white p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => changeMonth(-1)}
              className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-base font-bold capitalize text-stone-800">
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
              const inRange = selFrom && cell.date >= selFrom && cell.date <= selTo;
              const isEdge = cell.date === selFrom || cell.date === selTo;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDayClick(cell.date)}
                  className={cn(
                    'flex aspect-square w-full items-center justify-center rounded-md text-sm transition',
                    isEdge
                      ? 'bg-brand-500 font-bold text-white'
                      : inRange
                        ? 'bg-brand-100 font-medium text-brand-800'
                        : isToday
                          ? 'font-semibold text-brand-700 ring-1 ring-brand-300'
                          : 'text-stone-700 hover:bg-stone-100',
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Résumé + coche de validation */}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
            <p className="min-w-0 flex-1 truncate text-xs text-stone-500">
              {start ? describeRange(start, end || start) : 'Sélectionnez un jour'}
            </p>
            <Button onClick={confirm} disabled={!start} className="!px-3 !py-2">
              <Check className="h-4 w-4" />
              Valider
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
