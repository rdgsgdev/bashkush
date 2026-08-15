import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ChoiceOption {
  value: string;
  label: string;
}

interface SingleChoiceProps {
  legend: string;
  value?: string | null;
  options: ChoiceOption[];
  onChange: (value: string) => void;
}

/** Cartes à choix unique (style radio) — utilisé par l'onboarding et le profil. */
export function SingleChoice({ legend, value, options, onChange }: SingleChoiceProps) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="space-y-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition active:scale-[0.99]',
                active
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300',
              )}
            >
              <span>{opt.label}</span>
              {active && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

interface MultiChoiceProps {
  legend: string;
  values: string[];
  options: ChoiceOption[];
  onChange: (values: string[]) => void;
}

/** Chips à choix multiples (style checkbox) — utilisé par l'onboarding et le profil. */
export function MultiChoice({ legend, values, options, onChange }: MultiChoiceProps) {
  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = values.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition active:scale-[0.97]',
                active
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300',
              )}
            >
              {active && <Check className="h-3.5 w-3.5 text-brand-600" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
