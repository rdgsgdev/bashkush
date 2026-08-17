import type React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GroceryItem } from '../../types';
import { cn } from '../../lib/utils';
import { wasRecentDrag } from '../../lib/dnd';
import { GroceryItemRowContent } from './GroceryItemRow';

interface SortableGroceryItemRowProps {
  item: GroceryItem;
  /** Rayon courant (peut différer de item.aisle pendant un drag entre rayons). */
  aisle: string;
  onToggleCheck: (id: string) => void;
  onEdit: (item: GroceryItem) => void;
  onDelete: (id: string) => void;
}

/**
 * Ligne d'article draggable (long press ~250ms). Toute la ligne sert de prise ;
 * les boutons internes (coche, suppression) restent de simples clics.
 */
export function SortableGroceryItemRow({
  item,
  aisle,
  onToggleCheck,
  onEdit,
  onDelete,
}: SortableGroceryItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: 'item', aisle },
  });

  // Le onKeyDown déclaré plus bas (ouverture de la modale) surcharge celui du
  // capteur clavier présent dans `listeners` : le drag d'item reste un geste
  // pointeur, Enter/Space ouvrent l'édition.
  const rowListeners = listeners
    ? {
        ...listeners,
        onPointerDown: (event: React.PointerEvent) => {
          if ((event.target as HTMLElement).closest('button')) return;
          listeners.onPointerDown?.(event as unknown as PointerEvent);
        },
      }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...rowListeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => {
        if (wasRecentDrag()) return; // le relâchement d'un drag n'ouvre pas la modale
        onEdit(item);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(item);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Modifier ${item.name}`}
      className={cn(
        'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition [-webkit-touch-callout:none] select-none',
        item.checked && 'opacity-50',
        isDragging && 'opacity-30',
      )}
    >
      <GroceryItemRowContent
        item={item}
        onToggleCheck={onToggleCheck}
        onDelete={onDelete}
      />
    </li>
  );
}
