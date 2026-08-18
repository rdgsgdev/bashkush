import multer from 'multer';
import { HttpError } from './error';

/** Upload en mémoire (le fichier est ensuite poussé vers Supabase Storage). */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (_req, file, cb) => {
    // SVG accepté pour les logos de magasins (page Paramètres).
    if (/^image\/(svg\+xml|jpe?g|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new HttpError(400, 'Format d’image non supporté (svg, jpg, png, webp, gif)'));
    }
  },
});

/** Upload restreint aux logos de magasins : SVG (vectoriel) ou PNG. */
export const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (_req, file, cb) => {
    if (/^image\/(svg\+xml|png)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new HttpError(400, 'Format de logo non supporté (SVG ou PNG uniquement)'));
    }
  },
});
