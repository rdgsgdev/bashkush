import { useState } from 'react';
import { UserPlus, Users, X } from 'lucide-react';
import { Field, Input } from '../ui/FormControl';
import { Button } from '../ui/Button';
import { useFamily, useAddFamilyMember, useRemoveFamilyMember } from '../../api/family';
import type { FamilyMemberView } from '../../types/family';

/** Ligne d'un membre de la famille (avatar, nom/courriel, statut, retrait). */
function MemberRow({
  member,
  onRemove,
  removing,
}: {
  member: FamilyMemberView;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const initial = (member.fullName || member.email || '?').charAt(0).toUpperCase();
  return (
    <li className="flex items-center gap-3 rounded-xl bg-stone-100 px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-800">
          {member.fullName || member.email}
        </p>
        <p className="truncate text-xs text-stone-400">
          {member.fullName ? member.email : member.direction === 'invited_by' ? 't’a invité' : ''}
        </p>
      </div>
      {member.status === 'pending' ? (
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          En attente
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          Actif
        </span>
      )}
      <button
        type="button"
        onClick={() => onRemove(member.id)}
        disabled={removing}
        aria-label={`Retirer ${member.fullName || member.email}`}
        className="shrink-0 rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

/** Section « Ma famille » de la page profil : liste + ajout par courriel. */
export function FamilySection() {
  const { data: members, isLoading } = useFamily();
  const addMember = useAddFamilyMember();
  const removeMember = useRemoveFamilyMember();

  const [email, setEmail] = useState('');
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    setFamilyError(null);
    setAdded(false);
    addMember.mutate(email.trim().toLowerCase(), {
      onSuccess: () => {
        setEmail('');
        setAdded(true);
      },
      onError: (err) =>
        setFamilyError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Impossible d’ajouter ce membre.',
        ),
    });
  };

  const handleRemove = (id: string) => {
    setFamilyError(null);
    removeMember.mutate(id, {
      onError: (err) =>
        setFamilyError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Impossible de retirer ce membre.',
        ),
    });
  };

  return (
    <>
      {isLoading ? (
        <p className="text-sm text-stone-400">Chargement…</p>
      ) : members && members.length > 0 ? (
        <ul className="space-y-2">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              onRemove={handleRemove}
              removing={removeMember.isPending}
            />
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-sm text-stone-400">
          <Users className="h-4 w-4" />
          Ajoute un proche par courriel pour partager ton espace famille.
        </p>
      )}

      <Field label="Ajouter un membre (courriel)">
        <div className="flex gap-2">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setAdded(false);
            }}
            placeholder="courriel@exemple.com"
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAdd}
            loading={addMember.isPending}
            disabled={!email.trim()}
            className="shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </Field>
      {familyError && <p className="text-sm text-red-600">{familyError}</p>}
      {added && <p className="text-sm text-brand-700">Membre ajouté ✓</p>}
      <p className="text-[11px] text-stone-400">
        La personne devient active dès qu’elle se connecte avec ce courriel.
      </p>
    </>
  );
}
