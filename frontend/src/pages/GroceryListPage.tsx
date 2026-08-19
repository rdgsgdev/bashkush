import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Archive, ArchiveRestore, ShoppingCart, Trash2 } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Header } from '../components/layout/Header';
import { PullToRefresh } from '../components/common/PullToRefresh';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, FullScreenLoader } from '../components/ui/Feedback';
import { GroceryItemRow, GroceryItemRowContent } from '../components/grocery/GroceryItemRow';
import { SortableGroceryItemRow } from '../components/grocery/SortableGroceryItemRow';
import { SortableAisleCard, type AisleGroup } from '../components/grocery/SortableAisleCard';
import { GroceryItemModal } from '../components/grocery/GroceryItemModal';
import {
  useGrocery,
  useToggleCheck,
  useDeleteGroceryItem,
  useArchiveItems,
  useUnarchiveItems,
  useReorderGroceryItems,
  useReorderAisles,
  type ReorderItemInput,
} from '../api/grocery';
import { AISLE_LABELS } from '../types';
import type { GroceryItem } from '../types';
import { cn } from '../lib/utils';
import { hapticFeedback, markDragEnd } from '../lib/dnd';

type DragType = 'item' | 'card';

interface ActiveDrag {
  type: DragType;
  id: string;
  aisle?: string;
  /** Largeur de l'élément source, pour un overlay aux dimensions réelles. */
  width?: number;
}

/** Rayon visé par un « over » (ligne, corps de card ou card entière). */
function aisleOfOver(over: Over | null): string | null {
  const data = over?.data?.current as { type?: string; aisle?: string } | undefined;
  if (!data?.aisle) return null;
  if (data.type === 'item' || data.type === 'container' || data.type === 'card') return data.aisle;
  return null;
}

export function GroceryListPage() {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const active = useGrocery(false);
  const archived = useGrocery(true);

  const toggleCheck = useToggleCheck();
  const remove = useDeleteGroceryItem();
  const archive = useArchiveItems();
  const unarchive = useUnarchiveItems();
  const reorderItems = useReorderGroceryItems();
  const reorderAisles = useReorderAisles();

  const [editing, setEditing] = useState<{ open: boolean; item: GroceryItem | null }>({
    open: false,
    item: null,
  });

  // ── Drag & drop (onglet actif) ──────────────────────────────

  const aisles = active.data?.aisles ?? [];

  // Groupage des items actifs par rayon, triés par ordre de rayon puis
  // position manuelle (égalité → alphabétique).
  const serverGroups = useMemo<AisleGroup[]>(() => {
    const items = (active.data?.items ?? []);
    const order = new Map(aisles.map((a) => [a.name, a.sortOrder]));
    const labelOf = new Map(aisles.map((a) => [a.name, a.label ?? AISLE_LABELS[a.name] ?? a.name]));
    const map = new Map<string, GroceryItem[]>();
    for (const it of items) {
      if (!map.has(it.aisle)) map.set(it.aisle, []);
      map.get(it.aisle)!.push(it);
    }
    return [...map.entries()]
      .sort((a, b) => (order.get(a[0]) ?? 9999) - (order.get(b[0]) ?? 9999))
      .map(([aisle, items]) => ({
        aisle,
        label: labelOf.get(aisle) ?? AISLE_LABELS[aisle] ?? aisle,
        items: items.sort(
          // ?? 0 : cache persisté potentiellement antérieur au champ position.
          (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name, 'fr'),
        ),
      }));
  }, [active.data, aisles]);

  // Ordre local utilisé uniquement pendant un drag d'item (déplacement entre
  // rayons en direct) ; null = miroir du cache serveur.
  const [dragGroups, setDragGroups] = useState<AisleGroup[] | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  const groups = dragGroups ?? serverGroups;
  // Miroirs ref : les handlers dnd lisent l'état le plus récent sans closure périmée.
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const serverGroupsRef = useRef(serverGroups);
  serverGroupsRef.current = serverGroups;

  // Long press (~250ms) : le tap simple reste un clic, le scroll page reste
  // natif (le scroll tactile est bloqué seulement pendant le drag, cf. effet).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Pendant un drag tactile, on fige le scroll page (preventDefault non-passif)
  // pour que le doigt déplace l'élément — l'autoScroll dnd-kit prend le relais.
  const isDragging = activeDrag !== null;
  useEffect(() => {
    if (!isDragging) return;
    const preventScroll = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => document.removeEventListener('touchmove', preventScroll);
  }, [isDragging]);

  const handleDragStart = ({ active: a }: DragStartEvent) => {
    const data = a.data.current as { type?: DragType; aisle?: string } | undefined;
    if (!data?.type) return;
    hapticFeedback(12);
    setActiveDrag({
      type: data.type,
      id: String(a.id),
      aisle: data.aisle,
      width: a.rect.current.initial?.width,
    });
  };

  // Déplacement live d'un item vers un autre rayon : on ne touche PAS au
  // cache ici — le rayon de l'item est commité en base au relâchement.
  const handleDragOver = ({ active: a, over }: DragOverEvent) => {
    if (!over || a.data.current?.type !== 'item' || a.id === over.id) return;
    const toAisle = aisleOfOver(over);
    if (!toAisle) return;
    setDragGroups((prev) => {
      const base = prev ?? serverGroupsRef.current;
      const from = base.find((g) => g.items.some((it) => it.id === a.id));
      if (!from || from.aisle === toAisle) return prev ?? null;
      const item = from.items.find((it) => it.id === a.id)!;
      const to = base.find((g) => g.aisle === toAisle)!;
      const insertAt =
        over.data.current?.type === 'item'
          ? Math.max(0, to.items.findIndex((it) => it.id === over.id))
          : to.items.length;
      return base.map((g) => {
        if (g.aisle === from.aisle) {
          return { ...g, items: g.items.filter((it) => it.id !== a.id) };
        }
        if (g.aisle === toAisle) {
          const items = [...g.items];
          items.splice(insertAt, 0, item);
          return { ...g, items };
        }
        return g;
      });
    });
  };

  /** Commit des positions d'items : on n'envoie que ce qui a réellement bougé. */
  const commitItemOrder = (finalGroups: AisleGroup[]) => {
    const serverIndex = new Map<string, { aisle: string; index: number }>();
    serverGroupsRef.current.forEach((g) =>
      g.items.forEach((it, i) => serverIndex.set(it.id, { aisle: g.aisle, index: i })),
    );
    const payload: ReorderItemInput[] = [];
    finalGroups.forEach((g) =>
      g.items.forEach((it, i) => {
        const orig = serverIndex.get(it.id);
        if (!orig || orig.aisle !== g.aisle || orig.index !== i) {
          payload.push({ id: it.id, aisle: g.aisle, position: i });
        }
      }),
    );
    if (payload.length > 0) reorderItems.mutate(payload);
  };

  const handleDragEnd = ({ active: a, over }: DragEndEvent) => {
    markDragEnd(); // le relâchement ne doit pas déclencher le clic d'édition
    const type = a.data.current?.type as DragType | undefined;
    try {
      if (!type || !over) return;

      if (type === 'card') {
        const overAisle = aisleOfOver(over);
        const from = groupsRef.current.findIndex((g) => `card:${g.aisle}` === a.id);
        const to = groupsRef.current.findIndex((g) => g.aisle === overAisle);
        if (overAisle && from >= 0 && to >= 0 && from !== to) {
          const next = arrayMove(groupsRef.current, from, to);
          reorderAisles.mutate(next.map((g, i) => ({ name: g.aisle, sortOrder: i })));
        }
        return;
      }

      // Item : position finale au sein du (nouveau) rayon, puis commit.
      const final0 = dragGroups ?? groupsRef.current;
      const fromGroup = final0.find((g) => g.items.some((it) => it.id === a.id));
      if (!fromGroup) return;
      let final = final0;
      if (over.data.current?.type === 'item' && over.id !== a.id) {
        const fromIdx = fromGroup.items.findIndex((it) => it.id === a.id);
        const toIdx = fromGroup.items.findIndex((it) => it.id === over.id);
        if (toIdx >= 0 && fromIdx !== toIdx) {
          final = final.map((g) =>
            g.aisle === fromGroup.aisle
              ? { ...g, items: arrayMove(g.items, fromIdx, toIdx) }
              : g,
          );
        }
      }
      commitItemOrder(final);
    } finally {
      setActiveDrag(null);
      setDragGroups(null);
    }
  };

  const handleDragCancel = () => {
    markDragEnd();
    setActiveDrag(null);
    setDragGroups(null);
  };

  const activeItems = active.data?.items ?? [];
  const checkedCount = activeItems.filter((i) => i.checked).length;

  const archiveChecked = () => archive.mutate({ mode: 'checked' });
  const archiveAll = () => {
    if (activeItems.length === 0) return;
    if (confirm('Archiver toute la liste actuelle ?')) archive.mutate({ mode: 'all' });
  };

  // Contenus de l'overlay « détaché » (élément flottant qui suit le doigt).
  const activeItem =
    activeDrag?.type === 'item'
      ? groups.flatMap((g) => g.items).find((it) => it.id === activeDrag.id) ?? null
      : null;
  const activeCard =
    activeDrag?.type === 'card'
      ? groups.find((g) => g.aisle === activeDrag.aisle) ?? null
      : null;

  return (
    <div className="flex flex-1 flex-col">
      <Header
        title="Liste de courses"
        subtitle={`${activeItems.length} article${activeItems.length > 1 ? 's' : ''}`}
        action={
          <Button
            onClick={() => setEditing({ open: true, item: null })}
            className="!px-3 !py-2"
          >
            <Plus className="h-4 w-4" /> <span className="hidden xs:inline">Ajouter</span>
          </Button>
        }
      />

      <PullToRefresh queryKeys={[['grocery']]}>
        {/* Onglets */}
        <div className="flex gap-1 border-b border-stone-200 bg-white px-4">
          {(['active', 'archived'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative px-3 py-2.5 text-sm font-semibold transition',
                tab === t ? 'text-brand-600' : 'text-stone-400',
              )}
            >
              {t === 'active' ? 'À acheter' : 'Archivés'}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
            </button>
          ))}
        </div>

        <main className="flex-1 space-y-4 p-4">
          {tab === 'active' ? (
            <>
              {/* Barre d'actions d'archive */}
              {activeItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={archiveChecked}
                    disabled={checkedCount === 0}
                    loading={archive.isPending}
                    className="!py-2 text-xs"
                  >
                    <Archive className="h-4 w-4" /> Archiver les cochés{checkedCount ? ` (${checkedCount})` : ''}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={archiveAll}
                    disabled={activeItems.length === 0}
                    loading={archive.isPending}
                    className="!py-2 text-xs"
                  >
                    <Archive className="h-4 w-4" /> Tout archiver
                  </Button>
                </div>
              )}

              {active.isLoading ? (
                <FullScreenLoader />
              ) : active.isError && !active.data ? (
                <ErrorState />
              ) : groups.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="Liste vide"
                  description="Planifiez des plats ou ajoutez manuellement des articles pour remplir votre liste."
                  action={
                    <Button onClick={() => setEditing({ open: true, item: null })}>
                      <Plus className="h-4 w-4" /> Ajouter un article
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={groups.map((g) => `card:${g.aisle}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {groups.map((g) => (
                        <SortableAisleCard key={g.aisle} group={g}>
                          <SortableContext
                            items={g.items.map((i) => i.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {g.items.map((item) => (
                              <SortableGroceryItemRow
                                key={item.id}
                                item={item}
                                aisle={g.aisle}
                                onToggleCheck={(id) => toggleCheck.mutate(id)}
                                onEdit={(it) => setEditing({ open: true, item: it })}
                                onDelete={(id) => remove.mutate(id)}
                              />
                            ))}
                          </SortableContext>
                        </SortableAisleCard>
                      ))}
                    </SortableContext>

                    {/* Élément « détaché » flottant au-dessus des autres */}
                    <DragOverlay>
                      {activeItem && activeDrag ? (
                        <div
                          style={{ width: activeDrag.width }}
                          className="drag-overlay pointer-events-none flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-2xl ring-1 ring-stone-100"
                        >
                          <GroceryItemRowContent item={activeItem} />
                        </div>
                      ) : activeCard && activeDrag ? (
                        <div
                          style={{ width: activeDrag.width }}
                          className="drag-overlay pointer-events-none overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-stone-100"
                        >
                          <div className="flex items-center justify-between bg-stone-50 px-3 py-2">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">
                              {activeCard.label}
                            </h3>
                            <span className="text-xs text-stone-400">{activeCard.items.length}</span>
                          </div>
                          <ul className="divide-y divide-stone-100">
                            {activeCard.items.map((it) => (
                              <li key={it.id} className="flex items-center gap-3 px-3 py-2.5">
                                <GroceryItemRowContent item={it} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              )}
            </>
          ) : (
            // ── Onglet archivés (pas de drag & drop) ──
            <>
              {archived.isLoading ? (
                <FullScreenLoader />
              ) : archived.isError && !archived.data ? (
                <ErrorState />
              ) : (archived.data?.items.length ?? 0) === 0 ? (
                <EmptyState
                  icon={ArchiveRestore}
                  title="Aucun article archivé"
                  description="Les articles archivés apparaîtront ici et pourront être restaurés."
                />
              ) : (
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                        onClick={() => unarchive.mutate(undefined)}
                    loading={unarchive.isPending}
                    className="!py-2 text-xs"
                  >
                    <ArchiveRestore className="h-4 w-4" /> Tout restaurer
                  </Button>
                  <div className="overflow-hidden rounded-2xl bg-white shadow-card">
                    <ul className="divide-y divide-stone-100">
                      {archived.data!.items.map((item) => (
                        <GroceryItemRow
                          key={item.id}
                          item={item}
                          archived
                          onUnarchive={(id) => unarchive.mutate([id])}
                          onDelete={(id) => remove.mutate(id)}
                        />
                      ))}
                    </ul>
                    <div className="border-t border-stone-100 px-3 py-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Supprimer définitivement tous les articles archivés ?')) {
                            archived.data!.items.forEach((it) => remove.mutate(it.id));
                          }
                        }}
                        className="w-full text-xs text-red-500"
                      >
                        <Trash2 className="h-4 w-4" /> Vider les archives
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </PullToRefresh>

      <GroceryItemModal
        item={editing.item}
        aisles={aisles}
        open={editing.open}
        onClose={() => setEditing({ open: false, item: null })}
      />
    </div>
  );
}
