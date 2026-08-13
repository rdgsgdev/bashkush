import multer from 'multer';

/** Upload en mémoire (le fichier est ensuite poussé vers Supabase Storage). */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format d’image non supporté (jpg, png, webp, gif)'));
    }
  },
});
