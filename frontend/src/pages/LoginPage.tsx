import { useState } from 'react';
import { supabase } from '../lib/supabase';

/** Logo Apple (officiel, SVG inline). */
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.86 3.54-.77 1.25.1 2.19.6 2.81 1.5-2.57 1.54-2.14 4.93.42 5.88-.5 1.32-1.15 2.63-2.15 3.96.1-.06.2-.12.3-.18v-.02ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.32-2.05 4.17-3.74 4.25Z" />
    </svg>
  );
}

/** Logo Google "G" multicolore (officiel, SVG inline). */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

type Provider = 'apple' | 'google';

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Provider | null>(null);

  const signIn = async (provider: Provider) => {
    setError(null);
    setPending(provider);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      setError(
        provider === 'apple'
          ? 'Impossible de démarrer la connexion avec Apple. Vérifiez que le provider est activé dans Supabase.'
          : 'Impossible de démarrer la connexion avec Google. Vérifiez que le provider est activé dans Supabase.',
      );
      setPending(null);
      return;
    }
    // Succès → le navigateur est redirigé vers Apple / Google,
    // puis revient sur l'app où la session est détectée automatiquement.
  };

  const buttonBase =
    'flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition disabled:opacity-60';

  return (
    <div className="relative flex min-h-dvh flex-col bg-brand-500">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          Bienvenue sur Bashkush
        </h1>

        <button
          onClick={() => signIn('apple')}
          disabled={pending !== null}
          className={`${buttonBase} bg-black text-white active:scale-[0.98]`}
        >
          <AppleIcon />
          {pending === 'apple' ? 'Connexion…' : 'Continuer avec Apple'}
        </button>

        <button
          onClick={() => signIn('google')}
          disabled={pending !== null}
          className={`${buttonBase} bg-white text-stone-700 shadow-sm active:scale-[0.98]`}
        >
          <GoogleIcon />
          {pending === 'google' ? 'Connexion…' : 'Continuer avec Google'}
        </button>

        {error && <p className="mt-2 max-w-xs text-center text-xs text-white/90">{error}</p>}
      </div>

      {/* Logo BashKush — bas gauche, comme demandé */}
      <img
        src="/logo-menu.png"
        alt="Bashkush"
        className="absolute bottom-4 left-4 h-16 w-auto object-contain"
      />
    </div>
  );
}
