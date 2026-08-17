import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { GroceryItem } from '../../types';

export interface AisleGroup {
  aisle: string;
  label: string;
  items: GroceryItem[];
}

interface SortableAisleCardProps {
  group: AisleGroup;
  children: ReactNode;
}

/**
 * Card rayon draggable : le header sert de prise (long press ~250ms) — les
 * lignes à l'intérieur gèrent leur propre drag d'item. Le corps de la card est
 * une zone de dépôt (y compris pour un rayon vidé en plein drag).
 */
export function SortableAisleCard({ group, children }: SortableAisleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card:${group.aisle}`,
    data: { type: 'card', aisle: group.aisle },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${group.aisle}`,
    data: { type: 'container', aisle: group.aisle },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'overflow-hidden rounded-2xl bg-white shadow-card',
        isDragging && 'opacity-40',
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'flex cursor-grab items-center justify-between bg-stone-50 px-3 py-2 select-none [-webkit-touch-callout:none]',
          isDragging && 'cursor-grabbing',
        )}
        aria-label={`Déplacer le rayon ${group.label}`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">
          {group.label}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-400">{group.items.length}</span>
          <GripVertical className="h-4 w-4 text-stone-300" />
        </div>
      </div>
      <ul
        ref={setDropRef}
        className={cn(
          'divide-y divide-stone-100',
          // Rayon vidé en plein drag : hauteur minimum pour rester une cible de dépôt.
          group.items.length === 0 && 'min-h-14',
          isOver && 'ring-2 ring-inset ring-brand-400',
        )}
      >
        {children}
      </ul>
    </div>
  );
}
