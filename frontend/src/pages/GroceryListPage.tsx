import { useMemo, useState } from 'react';
import { Plus, Archive, ArchiveRestore, ShoppingCart, Trash2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, FullScreenLoader } from '../components/ui/Feedback';
import { GroceryItemRow } from '../components/grocery/GroceryItemRow';
import { GroceryItemModal } from '../components/grocery/GroceryItemModal';
import {
  useGrocery,
  useToggleCheck,
  useDeleteGroceryItem,
  useArchiveItems,
  useUnarchiveItems,
} from '../api/grocery';
import { AISLE_LABELS } from '../types';
import type { GroceryItem } from '../types';
import { cn } from '../lib/utils';

export function GroceryListPage() {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const active = useGrocery(false);
  const archived = useGrocery(true);

  const toggleCheck = useToggleCheck();
  const remove = useDeleteGroceryItem();
  const archive = useArchiveItems();
  const unarchive = useUnarchiveItems();

  const [editing, setEditing] = useState<{ open: boolean; item: GroceryItem | null }>({
    open: false,
    item: null,
  });

  const aisles = active.data?.aisles ?? [];

  // Groupage des items actifs par rayon, triés par ordre de rayon.
  const groups = useMemo(() => {
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
        items: items.sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      }));
  }, [active.data, aisles]);

  const activeItems = active.data?.items ?? [];
  const checkedCount = activeItems.filter((i) => i.checked).length;

  const archiveChecked = () => archive.mutate({ mode: 'checked' });
  const archiveAll = () => {
    if (activeItems.length === 0) return;
    if (confirm('Archiver toute la liste actuelle ?')) archive.mutate({ mode: 'all' });
  };

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
            ) : active.isError ? (
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
                {groups.map((g) => (
                  <div key={g.aisle} className="overflow-hidden rounded-2xl bg-white shadow-card">
                    <div className="flex items-center justify-between bg-stone-50 px-3 py-2">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">
                        {g.label}
                      </h3>
                      <span className="text-xs text-stone-400">{g.items.length}</span>
                    </div>
                    <ul className="divide-y divide-stone-100">
                      {g.items.map((item) => (
                        <GroceryItemRow
                          key={item.id}
                          item={item}
                          onToggleCheck={(id) => toggleCheck.mutate(id)}
                          onEdit={(it) => setEditing({ open: true, item: it })}
                          onDelete={(id) => remove.mutate(id)}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          // ── Onglet archivés ──
          <>
            {archived.isLoading ? (
              <FullScreenLoader />
            ) : archived.isError ? (
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

      <GroceryItemModal
        item={editing.item}
        aisles={aisles}
        open={editing.open}
        onClose={() => setEditing({ open: false, item: null })}
      />
    </div>
  );
}
