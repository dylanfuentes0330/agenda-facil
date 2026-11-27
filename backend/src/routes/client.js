import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ah } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { serializeReservation } from '../lib/serialize.js';
import { nowInZone } from '../lib/time.js';
import { cancelByClient, createReservation, reservationInclude } from '../services/reservations.js';
import { clientReservationQuerySchema, clientReservationSchema, idParam } from '../validators/schemas.js';

export const clientRouter = Router();
clientRouter.use(authenticate, requireRole('CLIENT'));

const include = {
  ...reservationInclude,
  business: { select: { id: true, name: true, slug: true, address: true, phone: true, cancellationHours: true, timezone: true } },
};

/** Busca o crea la ficha de cliente del usuario dentro del negocio (dato por negocio = multi-tenant). */
async function resolveClientRecord(tx, business, user) {
  const linked = await tx.client.findUnique({ where: { businessId_userId: { businessId: business.id, userId: user.id } } });
  if (linked) return linked.id;
  const byEmail = await tx.client.findUnique({ where: { businessId_email: { businessId: business.id, email: user.email } } });
  if (byEmail && byEmail.userId == null) {
    await tx.client.update({ where: { id: byEmail.id }, data: { userId: user.id } });
    return byEmail.id;
  }
  const created = await tx.client.create({
    data: { businessId: business.id, userId: user.id, name: user.name, email: byEmail ? null : user.email, phone: user.phone },
  });
  return created.id;
}

clientRouter.post(
  '/reservations',
  validate({ body: clientReservationSchema }),
  ah(async (req, res) => {
    const { businessSlug, serviceId, startAt, notes } = req.body;
    const business = await prisma.business.findFirst({ where: { slug: businessSlug, isActive: true } });
    if (!business) throw notFound('Negocio no encontrado');
    const reservation = await createReservation({
      business,
      serviceId,
      startAt,
      notes,
      enforceGrid: true,
      resolveClient: (tx) => resolveClientRecord(tx, business, req.user),
    });
    res.status(201).json({ reservation: serializeReservation({ ...reservation, business }) });
  }),
);

clientRouter.get(
  '/reservations',
  validate({ query: clientReservationQuerySchema }),
  ah(async (req, res) => {
    const { scope } = req.validatedQuery;
    const reservations = await prisma.reservation.findMany({
      where: { client: { userId: req.user.id } },
      include,
      orderBy: { startAt: scope === 'past' ? 'desc' : 'asc' },
      take: 200,
    });
    const filtered = reservations.filter((r) => {
      if (scope === 'all') return true;
      const upcoming = r.startAt > nowInZone(r.business.timezone) && r.status === 'CONFIRMED';
      return scope === 'upcoming' ? upcoming : !upcoming;
    });
    res.json({
      reservations: filtered.map((r) => {
        const now = nowInZone(r.business.timezone);
        const limit = new Date(r.startAt.getTime() - r.business.cancellationHours * 3_600_000);
        return { ...serializeReservation(r), canCancel: r.status === 'CONFIRMED' && now <= limit };
      }),
    });
  }),
);

clientRouter.patch(
  '/reservations/:id/cancel',
  validate({ params: idParam }),
  ah(async (req, res) => {
    const reservation = await cancelByClient({ user: req.user, reservationId: req.params.id });
    res.json({ reservation: serializeReservation(reservation) });
  }),
);
