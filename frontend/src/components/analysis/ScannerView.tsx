import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { CameraOff, Image as ImageIcon, Keyboard, ScanLine } from 'lucide-react';
import { BARCODE_RE } from '../../lib/openFoodFacts';
import { cn } from '../../lib/utils';

interface ScannerViewProps {
  /** true pendant une analyse ou quand le détail est ouvert → caméra coupée. */
  paused: boolean;
  /** Appelé avec un code-barres validé (EAN-8/13, UPC…). */
  onBarcode: (barcode: string) => void;
}

/** Retour haptique léger après une détection (Android — non supporté iOS). */
function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate?.(80);
  }
}

/**
 * Scanner code-barres façon Yuka : flux caméra continu prêt à décoder
 * (comme l'appareil photo), cadre de visée, sélection d'une photo dans
 * la galerie et saisie manuelle du code en repli.
 * La caméra démarre quand le composant est actif et s'arrête dès qu'il
 * est mis en pause (économie de batterie pendant l'analyse / le détail).
 */
export function ScannerView({ paused, onBarcode }: ScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  // Callback dans une ref : inutile de relancer la caméra si le parent rerender.
  const onBarcodeRef = useRef(onBarcode);
  onBarcodeRef.current = onBarcode;

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  // ── Cycle de vie caméra ─────────────────────────────────────
  useEffect(() => {
    if (paused) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    let cancelled = false;
    setCameraError(null);
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        videoEl,
        (result, _err, controls) => {
          if (result) {
            const text = result.getText();
            // On ignore les QR codes et textes divers : codes numériques uniquement.
            if (!BARCODE_RE.test(text)) return;
            controls.stop();
            controlsRef.current = null;
            haptic();
            onBarcodeRef.current(text);
          }
        },
      )
      .then((controls) => {
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setCameraError(
            "Accès à la caméra refusé. Autorise la caméra pour Bashkush dans les réglages du navigateur — tu peux aussi choisir une photo ou saisir le code.",
          );
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setCameraError('Aucune caméra détectée sur cet appareil. Choisis une photo ou saisis le code.');
        } else {
          setCameraError("La caméra n'a pas pu démarrer. Réessaie, choisis une photo ou saisis le code.");
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [paused, retryNonce]);

  // ── Galerie : décodage d'une photo ─────────────────────────
  async function handleGalleryFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permettre de re-choisir la même photo
    if (!file) return;
    setGalleryError(null);
    const url = URL.createObjectURL(file);
    try {
      const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url);
      const text = result.getText();
      if (!BARCODE_RE.test(text)) throw new Error('not-a-barcode');
      haptic();
      onBarcodeRef.current(text);
    } catch {
      setGalleryError('Aucun code-barres détecté sur cette photo. Essaie une photo plus nette, prise de près.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manualValue.replace(/\s+/g, '');
    if (!BARCODE_RE.test(code)) {
      setManualError('Code invalide : 6 à 14 chiffres.');
      return;
    }
    setManualError(null);
    setManualValue('');
    setManualOpen(false);
    onBarcodeRef.current(code);
  }

  return (
    <div className="space-y-3">
      {/* Viewport caméra */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-stone-900 shadow-card">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />

        {/* Cadre de visée */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-28 w-4/5 rounded-xl">
            <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-[3px] border-t-[3px] border-white/80" />
            <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-[3px] border-t-[3px] border-white/80" />
            <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-white/80" />
            <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-[3px] border-r-[3px] border-white/80" />
          </div>
        </div>
        <p className="absolute inset-x-0 bottom-14 text-center text-xs font-semibold text-white/90 drop-shadow">
          {cameraError ? 'Caméra indisponible' : 'Aligne le code-barres dans le cadre'}
        </p>

        {/* Bouton galerie */}
        <label
          className="absolute bottom-4 right-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-soft transition active:scale-95"
          aria-label="Scanner une photo de la galerie"
        >
          <ImageIcon className="h-5 w-5" />
          <input type="file" accept="image/*" className="hidden" onChange={handleGalleryFile} />
        </label>

        {/* Erreur caméra */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-900/90 px-6 text-center">
            <CameraOff className="h-8 w-8 text-white/70" />
            <p className="text-sm text-white/90">{cameraError}</p>
            <button
              onClick={() => setRetryNonce((n) => n + 1)}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>

      {galleryError && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{galleryError}</p>
      )}

      {/* Saisie manuelle */}
      {manualOpen ? (
        <form onSubmit={submitManual} className="flex gap-2">
          <input
            autoFocus
            inputMode="numeric"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value.replace(/[^\d\s]/g, ''))}
            placeholder="Ex : 3017620422003"
            className="field"
            aria-label="Code-barres"
          />
          <button type="submit" className="btn-primary shrink-0 !px-4 !py-2.5">
            <ScanLine className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setManualOpen(true)}
          className={cn('flex w-full items-center justify-center gap-2 text-sm font-semibold text-stone-500')}
        >
          <Keyboard className="h-4 w-4" /> Saisir le code-barres manuellement
        </button>
      )}
      {manualOpen && manualError && (
        <p className="text-xs font-medium text-red-600">{manualError}</p>
      )}
    </div>
  );
}
