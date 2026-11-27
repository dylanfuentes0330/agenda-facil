import { formatLocalDateTime } from './time.js';

export const money = (decimal) => (decimal == null ? null : Number(decimal));

export function serializeService(s) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    durationMinutes: s.durationMinutes,
    price: money(s.price),
    isActive: s.isActive,
  };
}

export function serializeClient(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    hasAccount: c.userId != null,
    createdAt: c.createdAt,
    ...(c._count ? { reservationsCount: c._count.reservations } : {}),
  };
}

export function serializeReservation(r) {
  return {
    id: r.id,
    startAt: formatLocalDateTime(r.startAt),
    endAt: formatLocalDateTime(r.endAt),
    status: r.status,
    price: money(r.priceAtBooking),
    notes: r.notes,
    cancelledAt: r.cancelledAt,
    cancelledBy: r.cancelledBy,
    createdAt: r.createdAt,
    service: r.service ? { id: r.service.id, name: r.service.name, durationMinutes: r.service.durationMinutes } : undefined,
    client: r.client ? { id: r.client.id, name: r.client.name, phone: r.client.phone, email: r.client.email } : undefined,
    business: r.business
      ? { id: r.business.id, name: r.business.name, slug: r.business.slug, address: r.business.address, phone: r.business.phone, cancellationHours: r.business.cancellationHours }
      : undefined,
  };
}

export function serializeUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
}
