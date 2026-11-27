import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ah } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { serializeBusinessPublic, serializeHours } from '../lib/business.js';
import { serializeService } from '../lib/serialize.js';
import { parseLocalDate } from '../lib/time.js';
import { getAvailability } from '../services/availability.js';
import { availabilityQuerySchema, publicBusinessQuerySchema } from '../validators/schemas.js';

export const publicRouter = Router();

async function findActiveBusiness(slug) {
  const business = await prisma.business.findFirst({ where: { slug, isActive: true } });
  if (!business) throw notFound('Negocio no encontrado');
  return business;
}

publicRouter.get(
  '/plans',
  ah(async (_req, res) => {
    const plans = await prisma.plan.findMany({ orderBy: { id: 'asc' } });
    res.json({ plans: plans.map(({ id: _id, ...p }) => p) });
  }),
);

// Directorio de negocios: solo negocios activos con al menos un servicio activo.
publicRouter.get(
  '/businesses',
  validate({ query: publicBusinessQuerySchema }),
  ah(async (req, res) => {
    const { q } = req.validatedQuery;
    const businesses = await prisma.business.findMany({
      where: {
        isActive: true,
        services: { some: { isActive: true } },
        ...(q ? { OR: [{ name: { contains: q } }, { category: { contains: q } }, { city: { contains: q } }] } : {}),
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
    res.json({ businesses: await Promise.all(businesses.map(serializeBusinessPublic)) });
  }),
);

publicRouter.get(
  '/businesses/:slug',
  ah(async (req, res) => {
    const business = await findActiveBusiness(req.params.slug);
    const [services, hours] = await Promise.all([
      prisma.service.findMany({ where: { businessId: business.id, isActive: true }, orderBy: { name: 'asc' } }),
      prisma.businessHour.findMany({ where: { businessId: business.id } }),
    ]);
    res.json({
      business: await serializeBusinessPublic(business),
      services: services.map(serializeService),
      hours: serializeHours(hours),
    });
  }),
);

publicRouter.get(
  '/businesses/:slug/availability',
  validate({ query: availabilityQuerySchema.omit({ excludeReservationId: true }) }),
  ah(async (req, res) => {
    const business = await findActiveBusiness(req.params.slug);
    const { serviceId, date } = req.validatedQuery;
    const service = await prisma.service.findFirst({ where: { id: serviceId, businessId: business.id, isActive: true } });
    if (!service) throw notFound('Servicio no encontrado');
    res.json(await getAvailability({ business, service, date: parseLocalDate(date) }));
  }),
);
