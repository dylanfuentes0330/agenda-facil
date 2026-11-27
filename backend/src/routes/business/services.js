import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ah } from '../../lib/asyncHandler.js';
import { notFound } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { serializeService } from '../../lib/serialize.js';
import { assertPlanLimit } from '../../lib/plans.js';
import { idParam, serviceSchema } from '../../validators/schemas.js';

export const servicesRouter = Router();

async function findOwn(req) {
  const service = await prisma.service.findFirst({ where: { id: req.params.id, businessId: req.business.id } });
  if (!service) throw notFound('Servicio no encontrado');
  return service;
}

servicesRouter.get(
  '/',
  ah(async (req, res) => {
    const services = await prisma.service.findMany({
      where: { businessId: req.business.id },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { reservations: true } } },
    });
    res.json({ services: services.map((s) => ({ ...serializeService(s), reservationsCount: s._count.reservations })) });
  }),
);

servicesRouter.post(
  '/',
  validate({ body: serviceSchema }),
  ah(async (req, res) => {
    const service = await prisma.$transaction(async (tx) => {
      await assertPlanLimit(tx, req.business, 'services');
      return tx.service.create({ data: { ...req.body, businessId: req.business.id } });
    });
    res.status(201).json({ service: serializeService(service) });
  }),
);

servicesRouter.get('/:id', validate({ params: idParam }), ah(async (req, res) => res.json({ service: serializeService(await findOwn(req)) })));

servicesRouter.put(
  '/:id',
  validate({ params: idParam, body: serviceSchema }),
  ah(async (req, res) => {
    await findOwn(req);
    const service = await prisma.service.update({ where: { id: req.params.id }, data: req.body });
    res.json({ service: serializeService(service) });
  }),
);

// Si el servicio tiene reservas se desactiva (se conserva el historial); si no, se elimina.
servicesRouter.delete(
  '/:id',
  validate({ params: idParam }),
  ah(async (req, res) => {
    const service = await findOwn(req);
    const used = await prisma.reservation.count({ where: { serviceId: service.id } });
    if (used > 0) {
      const updated = await prisma.service.update({ where: { id: service.id }, data: { isActive: false } });
      return res.json({ result: 'deactivated', message: 'El servicio tiene reservas en el historial, por lo que se desactivó.', service: serializeService(updated) });
    }
    await prisma.service.delete({ where: { id: service.id } });
    return res.json({ result: 'deleted', message: 'Servicio eliminado' });
  }),
);
