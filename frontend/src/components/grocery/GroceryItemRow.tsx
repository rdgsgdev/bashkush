import { Check, Trash2, RotateCcw } from 'lucide-react';
import type { GroceryItem } from '../../types';
import { cn, formatQty } from '../../lib/utils';
import { StoreLogo } from './StoreLogo';

interface GroceryItemRowProps {
  item: GroceryItem;
  onToggleCheck?: (id: string) => void;
  onEdit?: (item: GroceryItem) => void;
  onDelete?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  archived?: boolean;
}

export function GroceryItemRow({
  item,
  onToggleCheck,
  onEdit,
  onDelete,
  onUnarchive,
  archived,
}: GroceryItemRowProps) {
  // Ligne cliquable → édition (les lignes archivées ne s'éditent pas).
  const canEdit = Boolean(onEdit) && !archived;

  return (
    <li
      onClick={canEdit ? () => onEdit?.(item) : undefined}
      onKeyDown={
        canEdit
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit?.(item);
              }
            }
          : undefined
      }
      role={canEdit ? 'button' : undefined}
      tabIndex={canEdit ? 0 : undefined}
      aria-label={canEdit ? `Modifier ${item.name}` : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 transition',
        item.checked && !archived && 'opacity-50',
        canEdit && 'cursor-pointer hover:bg-stone-50',
      )}
    >
      {archived ? (
        <button
          onClick={() => onUnarchive?.(item.id)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-500"
          aria-label="Restaurer"
          title="Restaurer dans la liste"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation(); // la ligne entière ouvre l'édition
            onToggleCheck?.(item.id);
          }}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition',
            item.checked
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-stone-300 text-transparent',
          )}
          aria-label={item.checked ? 'Marquer non acheté' : 'Marquer acheté'}
        >
          <Check className="h-4 w-4" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium text-stone-800',
            item.checked && !archived && 'line-through',
          )}
        >
          {item.name}
        </p>
        {item.notes && <p className="truncate text-xs text-stone-400">{item.notes}</p>}
      </div>

      <span className="shrink-0 text-xs text-stone-400">
        {formatQty(item.quantity)} {item.unit}
      </span>

      <StoreLogo store={item.store} />

      <div className="flex shrink-0 items-center gap-0.5">
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // la ligne entière ouvre l'édition
              if (confirm(`Supprimer « ${item.name} » ?`)) onDelete(item.id);
            }}
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500"
            aria-label="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  );
}
