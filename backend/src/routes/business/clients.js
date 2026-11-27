import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ah } from '../../lib/asyncHandler.js';
import { conflict, notFound } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { serializeClient, serializeReservation } from '../../lib/serialize.js';
import { assertPlanLimit } from '../../lib/plans.js';
import { reservationInclude } from '../../services/reservations.js';
import { clientSchema, idParam } from '../../validators/schemas.js';
import { z } from 'zod';

export const clientsRouter = Router();

async function findOwn(req) {
  const client = await prisma.client.findFirst({ where: { id: req.params.id, businessId: req.business.id } });
  if (!client) throw notFound('Cliente no encontrado');
  return client;
}

export async function createClientRecord(tx, business, data) {
  await assertPlanLimit(tx, business, 'clients');
  if (data.email) {
    const dup = await tx.client.findUnique({ where: { businessId_email: { businessId: business.id, email: data.email } } });
    if (dup) throw conflict('CLIENT_EXISTS', 'Ya tienes un cliente registrado con ese correo');
  }
  return tx.client.create({ data: { ...data, businessId: business.id } });
}

clientsRouter.get(
  '/',
  validate({ query: z.object({ q: z.string().trim().max(120).optional() }) }),
  ah(async (req, res) => {
    const { q } = req.validatedQuery;
    const clients = await prisma.client.findMany({
      where: {
        businessId: req.business.id,
        ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}),
      },
      include: { _count: { select: { reservations: true } } },
      orderBy: { name: 'asc' },
      take: 500,
    });
    res.json({ clients: clients.map(serializeClient) });
  }),
);

clientsRouter.post(
  '/',
  validate({ body: clientSchema }),
  ah(async (req, res) => {
    const client = await prisma.$transaction((tx) => createClientRecord(tx, req.business, req.body));
    res.status(201).json({ client: serializeClient(client) });
  }),
);

clientsRouter.get('/:id', validate({ params: idParam }), ah(async (req, res) => res.json({ client: serializeClient(await findOwn(req)) })));

clientsRouter.put(
  '/:id',
  validate({ params: idParam, body: clientSchema }),
  ah(async (req, res) => {
    await findOwn(req);
    const client = await prisma.client.update({ where: { id: req.params.id }, data: req.body });
    res.json({ client: serializeClient(client) });
  }),
);

clientsRouter.delete(
  '/:id',
  validate({ params: idParam }),
  ah(async (req, res) => {
    const client = await findOwn(req);
    const count = await prisma.reservation.count({ where: { clientId: client.id } });
    if (count > 0) throw conflict('CLIENT_HAS_HISTORY', 'El cliente tiene reservas en el historial y no puede eliminarse');
    await prisma.client.delete({ where: { id: client.id } });
    res.json({ message: 'Cliente eliminado' });
  }),
);

clientsRouter.get(
  '/:id/reservations',
  validate({ params: idParam }),
  ah(async (req, res) => {
    const client = await findOwn(req);
    const reservations = await prisma.reservation.findMany({
      where: { clientId: client.id, businessId: req.business.id },
      include: reservationInclude,
      orderBy: { startAt: 'desc' },
    });
    res.json({ client: serializeClient(client), reservations: reservations.map(serializeReservation) });
  }),
);
