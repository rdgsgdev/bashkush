import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/FormControl';
import { AISLE_OPTIONS_LIST, UNIT_OPTIONS } from '../../lib/options';
import { useCreateGroceryItem, useUpdateGroceryItem } from '../../api/grocery';
import type { GroceryAisle, GroceryItem } from '../../types';

interface GroceryItemModalProps {
  item?: GroceryItem | null; // null = création
  aisles: GroceryAisle[];
  open: boolean;
  onClose: () => void;
}

export function GroceryItemModal({ item, aisles, open, onClose }: GroceryItemModalProps) {
  const isEdit = Boolean(item);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('g');
  const [aisle, setAisle] = useState('epicerie_seche');
  const [notes, setNotes] = useState('');
  const [customAisle, setCustomAisle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useCreateGroceryItem();
  const update = useUpdateGroceryItem();

  useEffect(() => {
    if (open) {
      setName(item?.name ?? '');
      setQuantity(item?.quantity ?? 1);
      setUnit(item?.unit ?? 'g');
      setAisle(item?.aisle ?? 'epicerie_seche');
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
    const finalAisle = customAisle.trim() || aisle;
    try {
      if (isEdit && item) {
        await update.mutateAsync({
          id: item.id,
          input: { name, quantity: Number(quantity), unit, aisle: finalAisle, notes },
        });
      } else {
        await create.mutateAsync({ name, quantity: Number(quantity), unit, aisle: finalAisle, notes });
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
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
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

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note (facultatif)" />
        </Field>
      </div>
    </Modal>
  );
}
