import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/FormControl';
import { AISLE_OPTIONS_LIST, STORE_OPTIONS, UNIT_OPTIONS } from '../../lib/options';
import { StoreLogo } from './StoreLogo';
import { useCreateGroceryItem, useUpdateGroceryItem } from '../../api/grocery';
import type { GroceryAisle, GroceryItem } from '../../types';
import { cn } from '../../lib/utils';

interface GroceryItemModalProps {
  item?: GroceryItem | null; // null = création
  aisles: GroceryAisle[];
  open: boolean;
  onClose: () => void;
}

export function GroceryItemModal({ item, aisles, open, onClose }: GroceryItemModalProps) {
  const isEdit = Boolean(item);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('g');
  const [aisle, setAisle] = useState('epicerie_seche');
  const [store, setStore] = useState('');
  const [notes, setNotes] = useState('');
  const [customAisle, setCustomAisle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useCreateGroceryItem();
  const update = useUpdateGroceryItem();

  useEffect(() => {
    if (open) {
      setName(item?.name ?? '');
      setQuantity(String(item?.quantity ?? 1));
      setUnit(item?.unit ?? 'g');
      setAisle(item?.aisle ?? 'epicerie_seche');
      setStore(item?.store ?? '');
      setNotes(item?.notes ?? '');
      setCustomAisle('');
      setError(null);
    }
  }, [open, item]);

  const allAisles = [
    ...AISLE_OPTIONS_LIST,
    ...aisles
      .filter((a) => !AISLE_OPTIONS_LIST.some((o) => o.value === a.name))
      .map((a) => ({ value: a.name, label: a.label ?? a.name })),
  ];

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    if (quantity.trim() === '') {
      setError('La quantité est obligatoire.');
      return;
    }
    const qty = Number(quantity);
    if (Number.isNaN(qty)) {
      setError('La quantité doit être un nombre.');
      return;
    }
    const finalAisle = customAisle.trim() || aisle;
    try {
      if (isEdit && item) {
        await update.mutateAsync({
          id: item.id,
          input: { name, quantity: qty, unit, aisle: finalAisle, store: store || null, notes },
        });
      } else {
        // UUID généré côté client : rend la création rejouable hors ligne
        // (le backend traite un doublon d'id comme un succès).
        await create.mutateAsync({
          id: crypto.randomUUID(),
          name,
          quantity: qty,
          unit,
          aisle: finalAisle,
          store: store || null,
          notes,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Échec de la sauvegarde.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier l’article' : 'Nouvel article'}
      size="wide"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} loading={create.isPending || update.isPending}>
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Field label="Nom">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Tomates" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantité">
            <Input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="ex : 200"
            />
          </Field>
          <Field label="Unité">
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
              {!UNIT_OPTIONS.includes(unit) && <option value={unit}>{unit}</option>}
            </Select>
          </Field>
        </div>

        <Field label="Rayon">
          <Select value={aisle} onChange={(e) => setAisle(e.target.value)}>
            {allAisles.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="…ou nouveau rayon">
          <Input
            value={customAisle}
            onChange={(e) => setCustomAisle(e.target.value)}
            placeholder="Laisser vide pour utiliser le rayon ci-dessus"
          />
        </Field>

        {/* Magasin : chips avec logos ('' = aucun). */}
        <Field label="Magasin">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStore('')}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                store === ''
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300',
              )}
            >
              Aucun
            </button>
            {STORE_OPTIONS.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => setStore(o.value)}
                aria-label={o.label}
                title={o.label}
                className={cn(
                  'flex items-center rounded-lg border px-2.5 py-1.5 transition',
                  store === o.value
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                    : 'border-stone-200 bg-white hover:border-stone-300',
                )}
              >
                <StoreLogo store={o.value} className="h-5 w-auto" />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note (facultatif)" />
        </Field>
      </div>
    </Modal>
  );
}
