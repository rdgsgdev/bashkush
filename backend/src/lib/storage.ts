import { supabase, STORAGE_BUCKET } from '../config/supabase';
import { randomUUID } from 'crypto';
import { HttpError } from '../middleware/error';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface UploadResult {
  /** URL publique de lecture. */
  url: string;
  /** Chemin dans le bucket (pour suppression ultérieure). */
  path: string;
}

/** Téléverse un buffer image dans le bucket Storage et renvoie son URL publique. */
export async function uploadImage(
  buffer: Buffer,
  mimetype: string,
  mealId: string,
): Promise<UploadResult> {
  const ext = EXT_BY_MIME[mimetype];
  if (!ext) throw new HttpError(400, 'Format d’image non supporté');

  const path = `${mealId}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, {
    contentType: mimetype,
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Storage upload error:', error);
    throw new HttpError(500, "Échec de l'upload de l'image");
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Supprime une image du bucket Storage. */
export async function deleteImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(STORAGE_BUCKET).remove([path]).catch(() => undefined);
}

/**
 * Auto-provisioning : crée le bucket Storage s'il n'existe pas encore.
 * Évite l'erreur "Bucket not found" au premier upload. Appelée au démarrage.
 */
export async function ensureBucket(): Promise<void> {
  const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });
  if (error) {
    if (/already exist/i.test(error.message)) return; // bucket déjà présent : OK
    // eslint-disable-next-line no-console
    console.warn(
      `⚠️ Bucket Storage « ${STORAGE_BUCKET} » : ${error.message}. ` +
        `Créez-le manuellement dans Supabase → Storage (Public).`,
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(`✓ Bucket Storage « ${STORAGE_BUCKET} » vérifié/créé (public).`);
  }
}
