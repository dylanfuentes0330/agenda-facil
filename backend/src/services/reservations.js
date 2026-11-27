import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { conflict, notFound, unprocessable } from '../lib/errors.js';
import { addMinutes, nowInZone, parseLocalDateTime } from '../lib/time.js';
import { BLOCKING_STATUSES, checkSlotRules } from './availability.js';

export const reservationInclude = {
  service: { select: { id: true, name: true, durationMinutes: true } },
  client: { select: { id: true, name: true, phone: true, email: true } },
};

const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 10_000,
  timeout: 15_000,
};

/**
 * Bloquea la fila del negocio (SELECT … FOR UPDATE). Todas las operaciones que
 * crean o mueven reservas de un mismo negocio se serializan con este candado,
 * por lo que dos peticiones simultáneas nunca pueden ocupar el mismo horario.
 */
async function lockBusiness(tx, businessId) {
  await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE`;
}

async function assertNoOverlap(tx, { businessId, startAt, endAt, excludeId }) {
  const clash = await tx.reservation.findFirst({
    where: {
      businessId,
      status: { in: BLOCKING_STATUSES },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    throw conflict('SLOT_TAKEN', 'El horario seleccionado ya no está disponible. Elige otra hora.');
  }
}

async function validateSlot(tx, { business, service, startAtText, enforceGrid }) {
  const startAt = parseLocalDateTime(startAtText);
  const hours = await tx.businessHour.findUnique({
    where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: startAt.getUTCDay() } },
  });
  const ruleError = checkSlotRules({
    startAt,
    durationMinutes: service.durationMinutes,
    hours,
    intervalMinutes: business.slotIntervalMinutes,
    now: nowInZone(business.timezone),
    enforceGrid,
  });
  if (ruleError) throw unprocessable(ruleError.code, ruleError.message);
  return { startAt, endAt: addMinutes(startAt, service.durationMinutes) };
}

async function getActiveService(tx, businessId, serviceId) {
  const service = await tx.service.findFirst({ where: { id: serviceId, businessId } });
  if (!service) throw notFound('El servicio no existe en este negocio');
  if (!service.isActive) throw unprocessable('SERVICE_INACTIVE', 'El servicio no está disponible actualmente');
  return service;
}

/** Crea una reserva con validación de reglas y control de concurrencia. */
export async function createReservation({ business, serviceId, startAt, notes, resolveClient, enforceGrid }) {
  return prisma.$transaction(async (tx) => {
    await lockBusiness(tx, business.id);
    const service = await getActiveService(tx, business.id, serviceId);
    const slot = await validateSlot(tx, { business, service, startAtText: startAt, enforceGrid });
    await assertNoOverlap(tx, { businessId: business.id, ...slot });
    const clientId = await resolveClient(tx);
    return tx.reservation.create({
      data: {
        businessId: business.id,
        serviceId: service.id,
        clientId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        notes,
        priceAtBooking: service.price,
      },
      include: reservationInclude,
    });
  }, TX_OPTIONS);
}

/** Reprograma o modifica una reserva (solo negocio). */
export async function updateReservation({ business, reservationId, serviceId, startAt, notes }) {
  return prisma.$transaction(async (tx) => {
    await lockBusiness(tx, business.id);
    const current = await tx.reservation.findFirst({ where: { id: reservationId, businessId: business.id } });
    if (!current) throw notFound('Reserva no encontrada');
    if (current.status !== 'CONFIRMED') {
      throw unprocessable('NOT_EDITABLE', 'Solo se pueden modificar reservas confirmadas');
    }
    const service = await getActiveService(tx, business.id, serviceId);
    const slot = await validateSlot(tx, { business, service, startAtText: startAt, enforceGrid: false });
    await assertNoOverlap(tx, { businessId: business.id, ...slot, excludeId: current.id });
    return tx.reservation.update({
      where: { id: current.id },
      data: {
        serviceId: service.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        notes,
        priceAtBooking: service.id === current.serviceId ? current.priceAtBooking : service.price,
      },
      include: reservationInclude,
    });
  }, TX_OPTIONS);
}

const TRANSITIONS = {
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED: ['CONFIRMED'],
  NO_SHOW: ['CONFIRMED'],
  CANCELLED: [],
};

/** Cambio de estado desde el panel del negocio. */
export async function changeStatus({ business, reservationId, status }) {
  const current = await prisma.reservation.findFirst({ where: { id: reservationId, businessId: business.id } });
  if (!current) throw notFound('Reserva no encontrada');
  if (current.status === status) return prisma.reservation.findUnique({ where: { id: current.id }, include: reservationInclude });
  if (!TRANSITIONS[current.status].includes(status)) {
    throw unprocessable('INVALID_TRANSITION', `No se puede pasar de ${current.status} a ${status}`);
  }
  const now = nowInZone(business.timezone);
  if ((status === 'COMPLETED' || status === 'NO_SHOW') && current.startAt > now) {
    throw unprocessable('NOT_STARTED', 'Solo se puede marcar como completada o inasistencia una cita cuya hora ya comenzó');
  }
  return prisma.reservation.update({
    where: { id: current.id },
    data:
      status === 'CANCELLED'
        ? { status, cancelledAt: new Date(), cancelledBy: 'BUSINESS' }
        : { status, cancelledAt: null, cancelledBy: null },
    include: reservationInclude,
  });
}

/** Cancelación por parte del cliente, respetando el margen configurado por el negocio. */
export async function cancelByClient({ user, reservationId }) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, client: { userId: user.id } },
    include: { business: true },
  });
  if (!reservation) throw notFound('Reserva no encontrada');
  if (reservation.status !== 'CONFIRMED') {
    throw unprocessable('NOT_CANCELLABLE', 'Solo se pueden cancelar reservas confirmadas');
  }
  const now = nowInZone(reservation.business.timezone);
  const limit = addMinutes(reservation.startAt, -reservation.business.cancellationHours * 60);
  if (now > limit) {
    throw unprocessable(
      'CANCELLATION_WINDOW_CLOSED',
      `Este negocio permite cancelar hasta ${reservation.business.cancellationHours} hora(s) antes de la cita. Comunícate directamente con el negocio.`,
    );
  }
  return prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: 'CLIENT' },
    include: { ...reservationInclude, business: true },
  });
}
