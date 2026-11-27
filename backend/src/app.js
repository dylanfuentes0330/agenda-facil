import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { clientRouter } from './routes/client.js';
import { businessRouter } from './routes/business/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp({ authRateLimitMax = env.authRateLimitMax } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (env.trustProxy > 0) app.set('trust proxy', env.trustProxy);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin(origin, callback) {
        // Peticiones sin Origin (curl, health checks, mismo origen vía CloudFront) se permiten.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authRateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' } },
  });

  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'ok', time: new Date().toISOString(), version: process.env.APP_VERSION || 'dev' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  app.use('/api/auth', authRouter({ authLimiter }));
  app.use('/api/public', publicRouter);
  app.use('/api/client', clientRouter);
  app.use('/api/business', businessRouter);

  if (env.storageDriver === 'local') {
    app.use('/uploads', express.static(path.resolve(env.uploadDir), { maxAge: '1h', index: false }));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
