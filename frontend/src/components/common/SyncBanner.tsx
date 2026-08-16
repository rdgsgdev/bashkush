import { useEffect, useState } from 'react';
import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';
import { useConnection } from '../../hooks/useConnection';
import { cn } from '../../lib/utils';

/**
 * Bandeau d'état de synchronisation, affiché quand l'app est hors ligne,
 * quand le serveur se réveille (Render en veille), pendant la synchro de la
 * file d'actions ou si des actions restent en attente.
 */

const CHECKING_GRACE = 2000; // ms avant d'afficher l'état « connexion… »

function plural(n: number) {
  return n > 1 ? 's' : '';
}

function Banner({
  tone,
  icon: Icon,
  spin,
  text,
}: {
  tone: 'amber' | 'blue' | 'green';
  icon: typeof CloudOff;
  spin?: boolean;
  text: string;
}) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
  } as const;
  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium',
        tones[tone],
      )}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', spin && 'animate-spin')} />
      <span className="truncate">{text}</span>
    </div>
  );
}

export function SyncBanner() {
  const { status, pendingActions, syncing, lastSyncedAt } = useConnection();
  const [showChecking, setShowChecking] = useState(false);

  // L'état « connexion… » du démarrage n'est affiché que s'il persiste
  // (évite un flash à chaque chargement quand le serveur répond vite).
  useEffect(() => {
    if (status === 'checking') {
      const t = setTimeout(() => setShowChecking(true), CHECKING_GRACE);
      return () => clearTimeout(t);
    }
    setShowChecking(false);
  }, [status]);

  // Accusé de synchronisation éphémère après un rejeu complet.
  const [justSynced, setJustSynced] = useState(false);
  useEffect(() => {
    if (lastSyncedAt) {
      setJustSynced(true);
      const t = setTimeout(() => setJustSynced(false), 3000);
      return () => clearTimeout(t);
    }
  }, [lastSyncedAt]);

  const pendingLabel =
    pendingActions > 0 ? ` — ${pendingActions} action${plural(pendingActions)} en attente` : '';

  if (status === 'offline') {
    return (
      <Banner
        tone="amber"
        icon={CloudOff}
        text={`Hors ligne — vos modifications seront synchronisées${pendingLabel}`}
      />
    );
  }

  if (status === 'server-down' || (status === 'checking' && showChecking)) {
    return (
      <Banner
        tone="amber"
        icon={RefreshCw}
        spin
        text={`Connexion au serveur en cours…${pendingLabel}`}
      />
    );
  }

  if (syncing) {
    return <Banner tone="blue" icon={RefreshCw} spin text="Synchronisation des modifications…" />;
  }

  if (status === 'online' && pendingActions > 0) {
    return (
      <Banner
        tone="amber"
        icon={CloudOff}
        text={`${pendingActions} action${plural(pendingActions)} en attente de synchronisation`}
      />
    );
  }

  if (justSynced) {
    return <Banner tone="green" icon={CheckCircle2} text="Modifications synchronisées" />;
  }

  return null;
}
