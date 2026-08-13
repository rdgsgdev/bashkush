import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function NumberStepper({ value, min = 0, max = 99, onChange }: NumberStepperProps) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="inline-flex items-center rounded-xl border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        className="rounded-l-xl p-2.5 text-stone-600 transition hover:bg-stone-100 disabled:opacity-30"
        aria-label="Diminuer"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[2.5rem] text-center text-base font-bold tabular-nums text-stone-800">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className="rounded-r-xl p-2.5 text-stone-600 transition hover:bg-stone-100 disabled:opacity-30"
        aria-label="Augmenter"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
