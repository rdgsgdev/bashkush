import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodType } from 'zod';

/** Valide le `body` d'une requête contre un schéma Zod. */
export const validateBody = (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
  req.body = schema.parse(req.body);
  next();
};

/** Valide la `query` d'une requête. */
export const validateQuery =
  (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query) as Record<string, unknown> as Request['query'];
    next();
  };
