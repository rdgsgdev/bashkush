import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { corsOrigins, isProd } from './config/env';
import routes from './routes';
import { errorHandler, notFound } from './middleware/error';

export const app = express();

app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(isProd ? 'combined' : 'dev'));

// Route de bienvenue (racine).
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Bashkush API',
    docs: '/api/health',
    endpoints: ['/api/meals', '/api/meal-plans', '/api/grocery-items', '/api/grocery-aisles'],
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);
