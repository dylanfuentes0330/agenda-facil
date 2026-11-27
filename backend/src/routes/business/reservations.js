import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ah } from '../../lib/asyncHandler.js';
import { notFound } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { serializeReservation } from '../../lib/serialize.js';
import { addDays, parseLocalDate } from '../../lib/time.js';
import { getAvailability } from '../../services/availability.js';
import { changeStatus, createReservation, reservationInclude, updateReservation } from '../../services/reservations.js';
import { createClientRecord } from './clients.js';
import {
  availabilityQuerySchema,
  businessReservationSchema,
  idParam,
  reservationQuerySchema,
  reservationStatusSchema,
  updateReservationSchema,
} from '../../validators/schemas.js';

export const reservationsRouter = Router();

reservationsRouter.get(
  '/',
  validate({ query: reservationQuerySchema }),
  ah(async (req, res) => {
    const { from, to, status, clientId, q, page, pageSize } = req.validatedQuery;
    const where = {
      businessId: req.business.id,
      ...(status ? { status } : {}),
      ...(clientId ? { clientId } : {}),
      ...(from || to
        ? { startAt: { ...(from ? { gte: parseLocalDate(from) } : {}), ...(to ? { lt: addDays(parseLocalDate(to), 1) } : {}) } }
        : {}),
      ...(q ? { OR: [{ client: { name: { contains: q } } }, { service: { name: { contains: q } } }] } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.reservation.count({ where }),
      prisma.reservation.findMany({
        where,
        include: reservationInclude,
        orderBy: { startAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json({ reservations: items.map(serializeReservation), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  }),
);

reservationsRouter.get(
  '/availability',
  validate({ query: availabilityQuerySchema }),
  ah(async (req, res) => {
    const { serviceId, date, excludeReservationId } = req.validatedQuery;
    const service = await prisma.service.findFirst({ where: { id: serviceId, businessId: req.business.id } });
    if (!service) throw notFound('Servicio no encontrado');
    res.json(await getAvailability({ business: req.business, service, date: parseLocalDate(date), excludeReservationId }));
  }),
);

reservationsRouter.post(
  '/',
  validate({ body: businessReservationSchema }),
  ah(async (req, res) => {
    const { serviceId, startAt, notes, clientId, newClient } = req.body;
    const business = req.business;
    const reservation = await createReservation({
      business,
      serviceId,
      startAt,
      notes,
      enforceGrid: false,
      resolveClient: async (tx) => {
        if (newClient) return (await createClientRecord(tx, business, newClient)).id;
        const client = await tx.client.findFirst({ where: { id: clientId, businessId: business.id } });
        if (!client) throw notFound('Cliente no encontrado');
        return client.id;
      },
    });
    res.status(201).json({ reservation: serializeReservation(reservation) });
  }),
);

reservationsRouter.get(
  '/:id',
  validate({ params: idParam }),
  ah(async (req, res) => {
    const reservation = await prisma.reservation.findFirst({ where: { id: req.params.id, businessId: req.business.id }, include: reservationInclude });
    if (!reservation) throw notFound('Reserva no encontrada');
    res.json({ reservation: serializeReservation(reservation) });
  }),
);

reservationsRouter.put(
  '/:id',
  validate({ params: idParam, body: updateReservationSchema }),
  ah(async (req, res) => {
    const reservation = await updateReservation({ business: req.business, reservationId: req.params.id, ...req.body });
    res.json({ reservation: serializeReservation(reservation) });
  }),
);

reservationsRouter.patch(
  '/:id/status',
  validate({ params: idParam, body: reservationStatusSchema }),
  ah(async (req, res) => {
    const reservation = await changeStatus({ business: req.business, reservationId: req.params.id, status: req.body.status });
    res.json({ reservation: serializeReservation(reservation) });
  }),
);
