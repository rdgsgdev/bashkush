import { ReactNode, useEffect, useRef, useState } from 'react';
import type React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { markDragEnd, wasRecentDrag, hapticFeedback } from '../../lib/dnd';

export interface EditableRow {
  id: string;
  label: string;
  /** Contenu à gauche du libellé (ex: logo du magasin). */
  left?: ReactNode;
}

interface EditableListSectionProps {
  /** Sous-titre optionnel (ex: « Magasins » dans la section Liste de courses). */
  title?: string;
  /** Explication courte sous le titre. */
  description?: string;
  rows: EditableRow[];
  loading?: boolean;
  /** Ajout / renommage / suppression / réordonnancement requièrent le serveur. */
  offline?: boolean;
  addPlaceholder?: string;
  onCreate: (label: string) => void;
  onUpdate: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onReorder: (order: { id: string; sortOrder: number }[]) => void;
  /** Libellé d'un item en cours d'opération (spinner). */
  pendingId?: string | null;
  /** Message d'erreur d'une mutation (affiché au-dessus de la liste). */
  error?: string | null;
}

/** Contenu d'une ligne (partagé entre la ligne triable et l'overlay de drag). */
function RowContent({
  row,
  editing,
  draft,
  setDraft,
  commitRename,
  cancelRename,
  offline,
  pending,
  onDelete,
}: {
  row: EditableRow;
  editing: boolean;
  draft: string;
  setDraft: (v: string) => void;
  commitRename: () => void;
  cancelRename: () => void;
  offline: boolean;
  pending: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {row.left}

      {editing ? (
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus -- édition inline immédiate, comme la liste de courses
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Entrée (desktop et clavier virtuel mobile) valide la
              // modification — sans laisser l'événement remonter jusqu'à
              // la ligne, qui rouvrirait l'édition.
              e.preventDefault();
              e.stopPropagation();
              commitRename();
            }
            if (e.key === 'Escape') {
              e.stopPropagation();
              cancelRename();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          maxLength={60}
          className="field min-w-0 flex-1 !py-1.5 text-sm"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{row.label}</span>
      )}

      {pending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-500" />
      ) : (
        !editing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // la ligne entière ouvre l'édition
              if (confirm(`Supprimer « ${row.label} » ?`)) onDelete(row.id);
            }}
            disabled={offline}
            aria-label={`Supprimer ${row.label}`}
            className="rounded p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )
      )}
    </>
  );
}

/**
 * Ligne d'option draggable (long press ~250ms), comme un article de la liste
 * de courses : toute la ligne sert de prise, un tap simple ouvre l'édition
 * inline. Les boutons internes restent de simples clics.
 */
function SortableRow({
  row,
  offline,
  pending,
  onUpdate,
  onDelete,
}: {
  row: EditableRow;
  offline: boolean;
  pending: boolean;
  onUpdate: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.label);
  // Anti-double-validation : Entrée puis perte de focus (claviers virtuels)
  // ne déclenchent qu'une seule sauvegarde.
  const committed = useRef(false);

  // Les boutons et l'input d'édition ne déclenchent pas le drag ; le onKeyDown
  // déclaré plus bas (édition clavier) surcharge celui du capteur clavier.
  const rowListeners = listeners
    ? {
        ...listeners,
        onPointerDown: (event: React.PointerEvent) => {
          if ((event.target as HTMLElement).closest('button, input')) return;
          listeners.onPointerDown?.(event as unknown as PointerEvent);
        },
      }
    : undefined;

  const openEdit = () => {
    committed.current = false;
    setDraft(row.label);
    setEditing(true);
  };
  const commitRename = () => {
    if (committed.current) return;
    committed.current = true;
    const label = draft.trim();
    if (label && label !== row.label) onUpdate(row.id, label);
    setEditing(false);
  };
  const cancelRename = () => {
    committed.current = true;
    setDraft(row.label);
    setEditing(false);
  };

  const contentProps = {
    row,
    editing,
    draft,
    setDraft,
    commitRename,
    cancelRename,
    offline,
    pending,
    onDelete,
  };

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...rowListeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => {
        if (editing || wasRecentDrag()) return; // le relâchement d'un drag n'ouvre pas l'édition
        openEdit();
      }}
      onKeyDown={(e) => {
        // En édition, Entrée/Échap sont traités par l'input (validation /
        // annulation) : la ligne n'ouvre pas une seconde édition.
        if (editing) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openEdit();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Modifier ${row.label}`}
      className={cn(
        'flex cursor-pointer items-center gap-2 px-3 py-2.5 transition [-webkit-touch-callout:none] select-none',
        isDragging && 'opacity-30',
      )}
    >
      <RowContent {...contentProps} />
    </li>
  );
}

/**
 * Section de liste éditable de la page Paramètres : ajout (champ + bouton
 * +), édition inline au tap sur la ligne, suppression et réordonnancement
 * drag & drop longue pression — mêmes gestes que la liste de courses
 * (chaque liste est indépendante : pas de drag d'une liste à l'autre).
 */
export function EditableListSection({
  title,
  description,
  rows,
  loading,
  offline = false,
  addPlaceholder = 'Ajouter…',
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
  pendingId = null,
  error = null,
}: EditableListSectionProps) {
  const [newLabel, setNewLabel] = useState('');
  const [activeDrag, setActiveDrag] = useState<{ id: string; label: string; left?: ReactNode } | null>(null);

  // Long press (~250ms) : le tap simple reste un clic (édition), le scroll
  // page reste natif (figé seulement pendant le drag, cf. effet).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Pendant un drag tactile, on fige le scroll page pour que le doigt
  // déplace l'élément — l'autoScroll dnd-kit prend le relais.
  useEffect(() => {
    if (!activeDrag) return;
    const preventScroll = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => document.removeEventListener('touchmove', preventScroll);
  }, [activeDrag]);

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    onCreate(label);
    setNewLabel('');
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    hapticFeedback(12);
    const row = rows.find((r) => r.id === active.id);
    if (row) setActiveDrag({ id: row.id, label: row.label, left: row.left });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    markDragEnd(); // le relâchement ne doit pas déclencher l'édition
    setActiveDrag(null);
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((r) => r.id === active.id);
    const to = rows.findIndex((r) => r.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(rows, from, to);
    onReorder(next.map((r, i) => ({ id: r.id, sortOrder: i })));
  };

  return (
    // Pas de carte ici : le contenu vit directement dans la carte repliable
    // de la section (même système que la page profil).
    <div className="space-y-3">
      {(title || description) && (
        <div>
          {title && (
            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">{title}</h3>
          )}
          {description && (
            <p className={cn('text-xs leading-relaxed text-stone-500', title && 'mt-1')}>
              {description}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-stone-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      ) : (
        <>
          {rows.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => {
                markDragEnd();
                setActiveDrag(null);
              }}
            >
              <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-100 bg-white">
                  {rows.map((row) => (
                    <SortableRow
                      key={row.id}
                      row={row}
                      offline={offline}
                      pending={pendingId === row.id}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
              </SortableContext>

              {/* Élément « détaché » flottant au-dessus des autres */}
              <DragOverlay>
                {activeDrag ? (
                  <div className="drag-overlay pointer-events-none flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-2xl ring-1 ring-stone-100">
                    <RowContent
                      row={{ id: activeDrag.id, label: activeDrag.label, left: activeDrag.left }}
                      editing={false}
                      draft={activeDrag.label}
                      setDraft={() => undefined}
                      commitRename={() => undefined}
                      cancelRename={() => undefined}
                      offline
                      pending={false}
                      onDelete={() => undefined}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <p className="rounded-xl bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
              Liste vide — ajoute un premier élément ci-dessous.
            </p>
          )}

          <div className="flex gap-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={addPlaceholder}
              maxLength={60}
              className="field flex-1 !py-2 text-sm"
            />
            <Button variant="secondary" onClick={handleAdd} disabled={offline || !newLabel.trim()} className="!px-3">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
