import { FormEvent, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

/** Modes de l'écran d'authentification (seul le contenu gauche change). */
type AuthMode = 'signin' | 'signup' | 'forgot';

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

/** Traduit les messages d'erreur Supabase les plus courants en français. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Courriel ou mot de passe incorrect.';
  if (m.includes('email not confirmed'))
    return "Votre courriel n'a pas encore été confirmé. Vérifiez votre boîte de réception.";
  if (m.includes('already registered'))
    return 'Un compte existe déjà avec ce courriel. Essayez de vous connecter.';
  if (m.includes('at least 6 characters'))
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.';
  if (m.includes('invalid email') || m.includes('validate email'))
    return 'Adresse courriel invalide.';
  if (m.includes('password')) return 'Mot de passe invalide.';
  return 'Une erreur est survenue. Veuillez réessayer.';
}

/** Champ courriel — style « pilule grise » du design. */
function EmailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">
        Courriel
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="vous@exemple.com"
        className="w-full rounded-xl border border-transparent bg-stone-100 px-4 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}

/** Champ mot de passe avec bascule de visibilité. */
function PasswordField({
  value,
  onChange,
  autoComplete = 'current-password',
  action,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  /** Lien optionnel affiché à droite du libellé (ex : mot de passe oublié). */
  action?: { label: string; onClick: () => void };
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor="password" className="block text-sm font-medium text-stone-700">
          Mot de passe
        </label>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="relative">
        <input
          id="password"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-transparent bg-stone-100 px-4 py-3 pr-12 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-600"
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<null | 'email' | 'google'>(null);

  /** Change de mode (connexion / inscription / oubli) en nettoyant les retours. */
  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
  };

  const signInWithGoogle = async () => {
    setError(null);
    setPending('google');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      setError(
        'Impossible de démarrer la connexion avec Google. Vérifiez que le provider est activé dans Supabase.',
      );
      setPending(null);
      return;
    }
    // Succès → le navigateur est redirigé vers Google,
    // puis revient sur l'app où la session est détectée automatiquement.
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Veuillez entrer votre adresse courriel.');
      return;
    }
    if (mode !== 'forgot' && password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setPending('email');
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) setError(translateAuthError(signInError.message));
        // Succès → la session est détectée par AuthInitializer → redirection auto.
      } else if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) {
          setError(translateAuthError(signUpError.message));
          return;
        }
        if (!data.session) {
          // Confirmation par courriel requise → on bascule vers la connexion.
          setPassword('');
          setMode('signin');
          setNotice(
            'Compte créé! Vérifiez votre boîte de réception pour confirmer votre courriel, puis connectez-vous.',
          );
        }
        // Sinon session immédiate → redirection automatique vers l'app.
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: window.location.origin,
        });
        if (resetError) {
          setError(translateAuthError(resetError.message));
          return;
        }
        setEmail('');
        setNotice(
          "Si un compte existe pour ce courriel, un lien de réinitialisation vient d'être envoyé.",
        );
      }
    } finally {
      setPending(null);
    }
  };

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const submitLabel = isSignup ? "S'inscrire" : isForgot ? 'Envoyer le lien' : 'Se connecter';
  const pendingLabel = isSignup ? 'Inscription…' : isForgot ? 'Envoi…' : 'Connexion…';

  return (
    <div className="flex min-h-dvh bg-[#FEFDF9]">
      {/* Colonne gauche : logo + formulaire (tout le contenu sur mobile) */}
      <div className="flex w-full flex-col px-6 py-6 sm:px-10 lg:w-[47%] lg:px-14 xl:px-20">
        <img src="/logo_horizontal_green_black.svg" alt="Bashkush" className="h-7 w-auto sm:h-8" />

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            {isForgot ? (
              <>
                <h1 className="mb-2 text-2xl font-bold leading-snug text-stone-800">
                  Mot de passe oublié?
                </h1>
                <p className="mb-8 text-sm leading-relaxed text-stone-500">
                  Entrez votre courriel et nous vous enverrons un lien pour réinitialiser votre
                  mot de passe.
                </p>
              </>
            ) : (
              <h1 className="mb-8 text-2xl font-bold leading-snug text-stone-800">
                {isSignup
                  ? 'Créez votre compte pour commencer à faire du '
                  : 'Veuillez vous connecter pour commencer à faire du '}
                <span className="italic">Bashhhhhkuuuuuush!</span>
              </h1>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <EmailField value={email} onChange={setEmail} />

              {!isForgot && (
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  action={
                    !isSignup
                      ? { label: 'Mot de passe oublié?', onClick: () => switchMode('forgot') }
                      : undefined
                  }
                />
              )}

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
              )}
              {notice && (
                <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-700">
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={pending !== null}
                className="w-full rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60"
              >
                {pending === 'email' ? pendingLabel : submitLabel}
              </button>
            </form>

            {!isForgot && (
              <>
                {/* Séparateur */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <span className="w-full border-t border-stone-200" />
                  </div>
                  <div className="relative flex justify-center text-xs font-medium uppercase tracking-wide text-stone-400">
                    <span className="bg-[#FEFDF9] px-4">ou</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={pending !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-[0.98] disabled:opacity-60"
                >
                  <GoogleIcon />
                  {pending === 'google' ? 'Connexion…' : 'Continuer avec Google'}
                </button>
              </>
            )}

            <p className="mt-8 text-center text-sm text-stone-500">
              {isSignup ? (
                <>
                  Déjà un compte?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-semibold text-brand-600 transition hover:text-brand-700"
                  >
                    Se connecter
                  </button>
                </>
              ) : isForgot ? (
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="font-semibold text-brand-600 transition hover:text-brand-700"
                >
                  Retour à la connexion
                </button>
              ) : (
                <>
                  Pas encore de compte?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-semibold text-brand-600 transition hover:text-brand-700"
                  >
                    S'inscrire
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Colonne droite : illustration (80 % de la colonne, centrée, fond
          visible autour) — masquée sur mobile */}
      <div className="relative hidden flex-1 items-center justify-center lg:flex">
        <img
          src="/logo_illustration.png"
          alt="Illustration Bashkush"
          className="h-4/5 w-4/5 object-contain"
        />
      </div>
    </div>
  );
}
