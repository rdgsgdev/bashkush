import { z } from 'zod';

export const addFamilyMemberSchema = z.object({
  // Courriel normalisé en minuscules (clé de matching côté contrôleur).
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Courriel invalide')
    .max(254),
});

export type AddFamilyMemberInput = z.infer<typeof addFamilyMemberSchema>;
