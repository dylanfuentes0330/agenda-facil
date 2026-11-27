import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { profileRouter } from './profile.js';
import { servicesRouter } from './services.js';
import { clientsRouter } from './clients.js';
import { reservationsRouter } from './reservations.js';
import { dashboardRouter } from './dashboard.js';

export const businessRouter = Router();
businessRouter.use(authenticate, requireRole('BUSINESS_ADMIN'));
businessRouter.use('/', profileRouter);
businessRouter.use('/services', servicesRouter);
businessRouter.use('/clients', clientsRouter);
businessRouter.use('/reservations', reservationsRouter);
businessRouter.use('/dashboard', dashboardRouter);
