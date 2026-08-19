import { useRef, useState } from 'react';
import {
  ChevronDown,
  Sparkles,
  UtensilsCrossed,
  Apple,
  ShoppingCart,
  CalendarDays,
  Brain,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Header } from '../components/layout/Header';
import { EditableListSection } from '../components/settings/EditableListSection';
import { StoreLogo } from '../components/grocery/StoreLogo';
import {
  useListOptions,
  useCreateListOption,
  useUpdateListOption,
  useDeleteListOption,
  useReorderListOptions,
  useUploadStoreLogo,
  useSettings,
  useUpdateSettings,
} from '../api/settings';
import {
  useAisles,
  useCreateAisle,
  useUpdateAisle,
  useDeleteAisle,
  useReorderAisles,
} from '../api/grocery';
import { useConnection } from '../hooks/useConnection';
import { getApiErrorMessage } from '../api/client';
import type { ListKey } from '../types';
import { cn } from '../lib/utils';

/**
 * Carte de section repliable, même système que la page profil : l'en-tête
 * (icône + titre + chevron) vit dans la carte, le contenu s'affiche en
 * dessous quand elle est dépliée — une seule carte par section, pas de
 * carte imbriquée par liste.
 */
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UtensilsCrossed;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card space-y-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <Icon className="h-4 w-4 shrink-0 text-brand-600" />
        <h2 className="flex-1 text-sm font-bold uppercase tracking-wide text-brand-700">{title}</h2>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-stone-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </section>
  );
}

/** Intitulé + bouton switch (réglages IA). */
function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-3 rounded-xl bg-stone-50 p-3 text-left transition disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-stone-800">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{description}</span>
      </span>
      <span
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-brand-500' : 'bg-stone-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

/**
 * Section de liste paramétrable (catégories, unités, magasins, types de
 * repas) branchée sur l'API /settings/lists/:listKey. Les défauts sont
 * matérialisés côté serveur au premier chargement.
 */
function ListOptionsSection({
  listKey,
  title,
  description,
  addPlaceholder,
  offline,
  renderLeft,
}: {
  listKey: ListKey;
  /** Sous-titre optionnel (utile quand la section contient plusieurs listes). */
  title?: string;
  description?: string;
  addPlaceholder: string;
  offline: boolean;
  /** Contenu à gauche de chaque ligne (ex: logo du magasin + upload). */
  renderLeft?: (row: { id: string; value: string; label: string; logoUrl?: string | null }) => ReactNode;
}) {
  const { data, isLoading } = useListOptions(listKey);
  const create = useCreateListOption(listKey);
  const update = useUpdateListOption(listKey);
  const remove = useDeleteListOption(listKey);
  const reorder = useReorderListOptions(listKey);

  const rows = (data ?? []).map((o) => ({
    id: o.id,
    value: o.value,
    label: o.label,
    logoUrl: o.logoUrl,
  }));

  const firstError = create.error ?? update.error ?? remove.error ?? reorder.error;

  return (
    <EditableListSection
      title={title}
      description={description}
      rows={rows.map((r) => ({ id: r.id, label: r.label, left: renderLeft?.(r) }))}
      loading={isLoading}
      offline={offline}
      addPlaceholder={addPlaceholder}
      onCreate={(label) => create.mutate({ label })}
      onUpdate={(id, label) => update.mutate({ id, input: { label } })}
      onDelete={(id) => remove.mutate(id)}
      onReorder={(order) => reorder.mutate(order)}
      pendingId={update.isPending && update.variables ? update.variables.id : null}
      error={firstError ? getApiErrorMessage(firstError) : null}
    />
  );
}

/** Ligne magasin : logo (uploadé ou SVG historique) + bouton d'upload SVG/PNG. */
function StoreRowLeft({ id, value, label, logoUrl }: { id: string; value: string; label: string; logoUrl?: string | null }) {
  const upload = useUploadStoreLogo();
  const fileRef = useRef<HTMLInputElement>(null);
  const offline = useConnection().status !== 'online';

  const pick = () => fileRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate({ id, file });
    e.target.value = '';
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <input
        ref={fileRef}
        type="file"
        accept="image/svg+xml,image/png,.svg,.png"
        onChange={onFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // la ligne entière ouvre l'édition
          pick();
        }}
        disabled={offline || upload.isPending}
        title="Changer le logo (SVG ou PNG)"
        aria-label={`Changer le logo de ${label}`}
        className="flex h-8 min-w-14 items-center justify-center rounded-lg border border-stone-200 bg-white px-2 transition hover:border-brand-400 disabled:opacity-50"
      >
        {upload.isPending ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        ) : (
          <StoreLogo
            store={value}
            logoUrl={logoUrl}
            label={label}
            className="h-5 w-auto"
            fallback={<span className="text-[11px] font-bold text-stone-400">{label.charAt(0)}</span>}
          />
        )}
      </button>
    </div>
  );
}

/** Section rayons : réutilise le CRUD /grocery-aisles existant. */
function AislesSection({ offline }: { offline: boolean }) {
  const { data: aisles, isLoading } = useAisles();
  const create = useCreateAisle();
  const update = useUpdateAisle();
  const remove = useDeleteAisle();
  const reorder = useReorderAisles();

  // Clé technique du rayon dérivée du libellé (comme côté backend pour les
  // autres listes) — les rayons personnalisés historiques gardent leur nom.
  const slug = (label: string) =>
    label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'rayon';

  const aisleError = create.error ?? update.error ?? remove.error ?? reorder.error;

  return (
    <EditableListSection
      title="Rayons"
      description="Sections du magasin utilisées pour regrouper les articles de la liste de courses."
      rows={(aisles ?? []).map((a) => ({ id: a.name, label: a.label ?? a.name }))}
      loading={isLoading}
      offline={offline}
      addPlaceholder="Ex : Boulangerie…"
      onCreate={(label) => create.mutate({ name: slug(label), label })}
      onUpdate={(name, label) => update.mutate({ name, input: { label } })}
      onDelete={(name) => remove.mutate(name)}
      onReorder={(order) =>
        reorder.mutate(order.map((o) => ({ name: o.id, sortOrder: o.sortOrder })))
      }
      pendingId={update.isPending && update.variables ? update.variables.name : null}
      error={aisleError ? getApiErrorMessage(aisleError) : null}
    />
  );
}

export function SettingsPage() {
  const { status } = useConnection();
  const offline = status !== 'online';

  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const aiGeneration = settings?.aiMealGenerationEnabled ?? true;
  const aiNutrition = settings?.aiNutritionEnabled ?? true;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header title="Paramètres" subtitle="Listes et réglages de la famille" />

      <main className="flex-1 space-y-4 p-4 lg:mx-auto lg:w-full lg:max-w-3xl">
        {offline && (
          <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            ⚠️ Hors ligne : la consultation reste possible, les modifications attendent le retour de la connexion.
          </p>
        )}

        {/* ── Mes plats ── */}
        <Section icon={UtensilsCrossed} title="Mes plats">
          <ListOptionsSection
            listKey="category"
            description="Catégories proposées lors de la création, de la modification et de la génération IA d'un plat, et dans les filtres."
            addPlaceholder="Ex : Curry…"
            offline={offline}
          />
        </Section>

        {/* ── Ingrédients ── */}
        <Section icon={Apple} title="Ingrédients">
          <ListOptionsSection
            listKey="unit"
            description="Unités proposées pour les quantités d'ingrédients (plats et liste de courses). L'IA les utilise pour la génération."
            addPlaceholder="Ex : pincée…"
            offline={offline}
          />
        </Section>

        {/* ── Liste de courses ── */}
        <Section icon={ShoppingCart} title="Liste de courses">
          <ListOptionsSection
            listKey="store"
            title="Magasins"
            description="Magasins proposés pour un article. Touche le logo d'un magasin pour téléverser un logo SVG ou PNG."
            addPlaceholder="Ex : Metro…"
            offline={offline}
            renderLeft={(row) => <StoreRowLeft id={row.id} value={row.value} label={row.label} logoUrl={row.logoUrl} />}
          />
          <AislesSection offline={offline} />
        </Section>

        {/* ── Calendrier ── */}
        <Section icon={CalendarDays} title="Calendrier">
          <ListOptionsSection
            listKey="meal_type"
            description="Types de repas proposés lors de la planification d'un plat (petit-déjeuner, dîner…)."
            addPlaceholder="Ex : Goûter…"
            offline={offline}
          />
        </Section>

        {/* ── Intelligence artificielle ── */}
        <Section icon={Brain} title="Intelligence artificielle">
          <div className="space-y-2">
            <ToggleRow
              title="Génération et modification de plats"
              description="Active l'IA (Perplexity Sonar) pour générer ou modifier un plat en tenant compte des profils, catégories, unités et rayons de la famille."
              checked={aiGeneration}
              onChange={(value) => updateSettings.mutate({ aiMealGenerationEnabled: value })}
              disabled={offline || updateSettings.isPending}
            />
            <ToggleRow
              title="Complétion des apports nutritionnels"
              description="Active la récupération automatique des apports (calories, protéines…) quand tu ajoutes ou modifies un ingrédient dans un plat."
              checked={aiNutrition}
              onChange={(value) => updateSettings.mutate({ aiNutritionEnabled: value })}
              disabled={offline || updateSettings.isPending}
            />
            {updateSettings.isError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                Impossible d'enregistrer le réglage. Réessaie.
              </p>
            )}
            <p className="px-1 text-[11px] leading-relaxed text-stone-400">
              <Sparkles className="mr-1 inline h-3 w-3" />
              Ces réglages s'appliquent à toute la famille.
            </p>
          </div>
        </Section>
      </main>
    </div>
  );
}
