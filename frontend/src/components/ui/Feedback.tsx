import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

/** État de chargement plein éran. */
export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-stone-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-brand-500" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

/** État vide avec icône. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="rounded-2xl bg-stone-100 p-4 text-stone-400">
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <p className="font-semibold text-stone-700">{title}</p>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Message d'erreur. */
export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="rounded-xl bg-red-50 px-4 py-6 text-center text-sm text-red-600">
      {message ?? 'Une erreur est survenue. Vérifiez que le backend est bien démarré.'}
    </div>
  );
}
