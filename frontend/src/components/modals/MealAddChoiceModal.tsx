import { PenLine, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { cn } from '../../lib/utils';

interface MealAddChoiceModalProps {
  open: boolean;
  onClose: () => void;
  /** 'ai' → modale de génération IA, 'manual' → modale d'ajout manuelle. */
  onChoose: (mode: 'ai' | 'manual') => void;
}

/** Première étape de l'ajout d'un plat : génération IA ou ajout manuel. */
export function MealAddChoiceModal({ open, onClose, onChoose }: MealAddChoiceModalProps) {
  const options = [
    {
      mode: 'ai' as const,
      icon: Sparkles,
      title: 'Générer avec IA',
      description: 'Un plat sur mesure, adapté aux profils nutritionnels des membres sélectionnés.',
      accent: 'border-brand-200 hover:border-brand-400 hover:bg-brand-50/50',
      iconColor: 'bg-brand-100 text-brand-600',
    },
    {
      mode: 'manual' as const,
      icon: PenLine,
      title: 'Ajouter manuellement',
      description: 'Crée le plat vous-même (comportement habituel) ou importez un JSON.',
      accent: 'border-stone-200 hover:border-stone-400 hover:bg-stone-50',
      iconColor: 'bg-stone-100 text-stone-600',
    },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Nouveau plat">
      <div className="space-y-3">
        {options.map(({ mode, icon: Icon, title, description, accent, iconColor }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChoose(mode)}
            className={cn(
              'flex w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left shadow-card transition',
              accent,
            )}
          >
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', iconColor)}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-stone-800">{title}</span>
              <span className="block text-xs leading-relaxed text-stone-500">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
