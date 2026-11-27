import { prisma } from '../lib/prisma.js';
import { addDays, addMinutes, formatHHMM, formatLocalDateTime, hhmmToMinutes, minutesOfDay, nowInZone, startOfLocalDay } from '../lib/time.js';

// Estados que ocupan la agenda (una reserva cancelada libera el horario).
export const BLOCKING_STATUSES = ['CONFIRMED', 'COMPLETED', 'NO_SHOW'];
export const MAX_DAYS_AHEAD = 90;

/**
 * Cálculo PURO de franjas para un día (sin acceso a BD → fácil de probar).
 * @param {object} p
 * @param {Date} p.day           inicio del día (hora local, campos UTC)
 * @param {{isOpen:boolean,openTime:string,closeTime:string}|undefined} p.hours
 * @param {number} p.durationMinutes
 * @param {number} p.intervalMinutes
 * @param {{startAt:Date,endAt:Date}[]} p.busy
 * @param {Date} p.now           "ahora" en hora local del negocio
 */
export function computeSlots({ day, hours, durationMinutes, intervalMinutes, busy, now }) {
  if (!hours || !hours.isOpen) return [];
  const open = hhmmToMinutes(hours.openTime);
  const close = hhmmToMinutes(hours.closeTime);
  const slots = [];
  for (let t = open; t + durationMinutes <= close; t += intervalMinutes) {
    const startAt = addMinutes(day, t);
    const endAt = addMinutes(startAt, durationMinutes);
    const isPast = startAt <= now;
    const overlaps = busy.some((b) => b.startAt < endAt && b.endAt > startAt);
    slots.push({
      time: formatHHMM(startAt),
      startAt: formatLocalDateTime(startAt),
      endAt: formatLocalDateTime(endAt),
      available: !isPast && !overlaps,
      reason: isPast ? 'PAST' : overlaps ? 'BUSY' : null,
    });
  }
  return slots;
}

/**
 * Reglas para aceptar una reserva en [startAt, endAt). Devuelve un código de error o null.
 * No verifica choques con otras reservas (eso se hace dentro de la transacción).
 */
export function checkSlotRules({ startAt, durationMinutes, hours, intervalMinutes, now, enforceGrid }) {
  if (startAt <= now) return { code: 'PAST_TIME', message: 'No se pueden agendar citas en el pasado' };
  if (startAt > addDays(startOfLocalDay(now), MAX_DAYS_AHEAD + 1)) {
    return { code: 'TOO_FAR', message: `Solo se puede reservar con hasta ${MAX_DAYS_AHEAD} días de anticipación` };
  }
  if (!hours || !hours.isOpen) return { code: 'CLOSED_DAY', message: 'El negocio no atiende ese día' };
  const open = hhmmToMinutes(hours.openTime);
  const close = hhmmToMinutes(hours.closeTime);
  const start = minutesOfDay(startAt);
  const end = start + durationMinutes; // close <= 23:59, por lo que nunca cruza la medianoche
  if (start < open || end > close) {
    return { code: 'OUTSIDE_HOURS', message: `La cita debe estar dentro del horario de atención (${hours.openTime} a ${hours.closeTime})` };
  }
  if (enforceGrid && (start - open) % intervalMinutes !== 0) {
    return { code: 'INVALID_SLOT', message: 'La hora seleccionada no corresponde a una franja disponible' };
  }
  return null;
}

export async function getAvailability({ business, service, date, excludeReservationId }) {
  const day = startOfLocalDay(date);
  const hours = await prisma.businessHour.findUnique({
    where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: day.getUTCDay() } },
  });
  const busy = await prisma.reservation.findMany({
    where: {
      businessId: business.id,
      status: { in: BLOCKING_STATUSES },
      startAt: { lt: addDays(day, 1) },
      endAt: { gt: day },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: { startAt: true, endAt: true },
  });
  const now = nowInZone(business.timezone);
  const tooFar = day > addDays(startOfLocalDay(now), MAX_DAYS_AHEAD);
  const slots = tooFar
    ? []
    : computeSlots({ day, hours, durationMinutes: service.durationMinutes, intervalMinutes: business.slotIntervalMinutes, busy, now });
  return {
    date: formatLocalDateTime(day).slice(0, 10),
    isOpen: Boolean(hours?.isOpen),
    openTime: hours?.openTime ?? null,
    closeTime: hours?.closeTime ?? null,
    service: { id: service.id, name: service.name, durationMinutes: service.durationMinutes },
    slots,
    message: tooFar
      ? `Solo se puede reservar con hasta ${MAX_DAYS_AHEAD} días de anticipación`
      : !hours?.isOpen
        ? 'El negocio no atiende este día'
        : null,
  };
}
