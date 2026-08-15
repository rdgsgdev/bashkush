import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { HttpError } from './error';

export interface AuthedRequest extends Request {
  /** Utilisateur Supabase validé par le jeton Bearer. */
  authUser?: { id: string; email: string | null };
}

/**
 * Vérifie le jeton Supabase (Authorization: Bearer <token>) envoyé par le frontend.
 * Renvoie 401 si absent ou invalide. Les données restent partagées entre
 * utilisateurs connectés — ce middleware protège uniquement l'accès à l'API.
 */
export const requireAuth = async (req: AuthedRequest, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authentification requise');
    }

    const token = header.slice('Bearer '.length).trim();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new HttpError(401, 'Session invalide ou expirée');
    }

    req.authUser = { id: data.user.id, email: data.user.email ?? null };
    next();
  } catch (err) {
    next(err);
  }
};
