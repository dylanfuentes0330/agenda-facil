import { beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createService, nextDate, registerBusiness, registerClient } from '../helpers.js';
import { prisma } from '../../src/lib/prisma.js';
import { parseLocalDateTime } from '../../src/lib/time.js';

// Horario inicial por defecto: lunes a viernes 09:00-18:00, intervalos de 30 min, zona America/Bogota.
describe('Flujo MVP de reservas', () => {
  let biz;
  let service;
  let client;
  const monday = nextDate(1);
  const sunday = nextDate(0);

  beforeAll(async () => {
    biz = await registerBusiness({ businessName: 'Peluquería Flujo' });
    service = await createService(biz.token, { name: 'Corte', durationMinutes: 60, price: 35000 });
    client = await registerClient();
  });

  it('el cliente ve el negocio en el directorio público con sus servicios', async () => {
    const list = await api().get('/api/public/businesses?q=Flujo');
    expect(list.body.businesses.map((b) => b.slug)).toContain(biz.business.slug);
    const detail = await api().get(`/api/public/businesses/${biz.business.slug}`);
    expect(detail.body.services.map((s) => s.name)).toEqual(['Corte']);
    expect(detail.body.hours).toHaveLength(7);
  });

  it('consulta la disponibilidad de un día laboral y de un día cerrado', async () => {
    const res = await api().get(`/api/public/businesses/${biz.business.slug}/availability`).query({ serviceId: service.id, date: monday });
    expect(res.status).toBe(200);
    expect(res.body.isOpen).toBe(true);
    expect(res.body.slots[0]).toMatchObject({ time: '09:00', available: true });
    expect(res.body.slots.at(-1).time).toBe('17:00'); // 17:00 + 60 min = 18:00 (cierre)
    const closed = await api().get(`/api/public/businesses/${biz.business.slug}/availability`).query({ serviceId: service.id, date: sunday });
    expect(closed.body.isOpen).toBe(false);
    expect(closed.body.slots).toEqual([]);
  });

  it('el cliente reserva, el negocio la ve y la franja deja de estar disponible', async () => {
    const res = await api().post('/api/client/reservations').set(auth(client.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt: `${monday}T10:00`, notes: 'Primera vez' });
    expect(res.status).toBe(201);
    expect(res.body.reservation).toMatchObject({ startAt: `${monday}T10:00`, endAt: `${monday}T11:00`, status: 'CONFIRMED', price: 35000 });

    const list = await api().get('/api/business/reservations').query({ from: monday, to: monday }).set(auth(biz.token));
    expect(list.body.reservations).toHaveLength(1);
    expect(list.body.reservations[0].client.name).toBe('Cliente Prueba');

    const avail = await api().get(`/api/public/businesses/${biz.business.slug}/availability`).query({ serviceId: service.id, date: monday });
    const map = Object.fromEntries(avail.body.slots.map((s) => [s.time, s.available]));
    // Servicio de 60 min con reserva 10:00-11:00: 09:00 sigue libre (termina justo a las 10:00)
    expect(map).toMatchObject({ '09:00': true, '09:30': false, '10:00': false, '10:30': false, '11:00': true });
  });

  it('impide la doble reserva y los solapamientos parciales', async () => {
    const other = await registerClient();
    const same = await api().post('/api/client/reservations').set(auth(other.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt: `${monday}T10:00` });
    expect(same.status).toBe(409);
    expect(same.body.error.code).toBe('SLOT_TAKEN');
    const partial = await api().post('/api/client/reservations').set(auth(other.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt: `${monday}T10:30` });
    expect(partial.status).toBe(409);
    const before = await api().post('/api/client/reservations').set(auth(other.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt: `${monday}T09:30` });
    expect(before.status).toBe(409);
  });

  it('bajo concurrencia, solo una de 10 reservas simultáneas al mismo horario tiene éxito', async () => {
    const clients = await Promise.all(Array.from({ length: 10 }, () => registerClient()));
    const results = await Promise.all(
      clients.map((c) =>
        api().post('/api/client/reservations').set(auth(c.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt: `${monday}T14:00` }),
      ),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    const count = await prisma.reservation.count({ where: { businessId: biz.business.id, startAt: parseLocalDateTime(`${monday}T14:00`), status: 'CONFIRMED' } });
    expect(count).toBe(1);
  });

  it('rechaza reservas en el pasado, en días cerrados, fuera de horario o fuera de la grilla', async () => {
    const send = (startAt) => api().post('/api/client/reservations').set(auth(client.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt });
    expect((await send('2020-01-06T10:00')).body.error.code).toBe('PAST_TIME');
    expect((await send(`${sunday}T10:00`)).body.error.code).toBe('CLOSED_DAY');
    expect((await send(`${monday}T17:30`)).body.error.code).toBe('OUTSIDE_HOURS');
    expect((await send(`${monday}T11:10`)).body.error.code).toBe('INVALID_SLOT');
    expect((await send('2026-02-30T10:00')).status).toBe(400);
  });

  it('el cliente consulta sus reservas y las cancela; el horario queda libre otra vez', async () => {
    const mine = await api().get('/api/client/reservations').set(auth(client.token));
    expect(mine.body.reservations).toHaveLength(1);
    const r = mine.body.reservations[0];
    expect(r.canCancel).toBe(true);
    expect(r.business.slug).toBe(biz.business.slug);
    const cancel = await api().patch(`/api/client/reservations/${r.id}/cancel`).set(auth(client.token));
    expect(cancel.status).toBe(200);
    expect(cancel.body.reservation).toMatchObject({ status: 'CANCELLED', cancelledBy: 'CLIENT' });
    const again = await api().patch(`/api/client/reservations/${r.id}/cancel`).set(auth(client.token));
    expect(again.status).toBe(422);
    const rebook = await api().post('/api/client/reservations').set(auth(client.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt: `${monday}T10:00` });
    expect(rebook.status).toBe(201);
    const past = await api().get('/api/client/reservations?scope=past').set(auth(client.token));
    expect(past.body.reservations.map((x) => x.status)).toContain('CANCELLED');
  });

  it('respeta el margen de cancelación configurado por el negocio', async () => {
    await api().put('/api/business/settings').set(auth(biz.token)).send({ timezone: 'America/Bogota', slotIntervalMinutes: 30, cancellationHours: 168 });
    const c = await registerClient();
    const tuesday = nextDate(2, 1);
    const booked = await api().post('/api/client/reservations').set(auth(c.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt: `${tuesday}T09:00` });
    expect(booked.status).toBe(201);
    const cancel = await api().patch(`/api/client/reservations/${booked.body.reservation.id}/cancel`).set(auth(c.token));
    expect(cancel.status).toBe(422);
    expect(cancel.body.error.code).toBe('CANCELLATION_WINDOW_CLOSED');
    await api().put('/api/business/settings').set(auth(biz.token)).send({ timezone: 'America/Bogota', slotIntervalMinutes: 30, cancellationHours: 2 });
  });

  it('el negocio crea una cita con cliente nuevo, la reprograma y la cancela', async () => {
    const created = await api().post('/api/business/reservations').set(auth(biz.token)).send({ serviceId: service.id, startAt: `${monday}T15:15`, newClient: { name: 'Carlos Ruiz', phone: '3205556677' } });
    expect(created.status).toBe(201);
    const id = created.body.reservation.id;
    const conflict = await api().put(`/api/business/reservations/${id}`).set(auth(biz.token)).send({ serviceId: service.id, startAt: `${monday}T14:30` });
    expect(conflict.status).toBe(409);
    const moved = await api().put(`/api/business/reservations/${id}`).set(auth(biz.token)).send({ serviceId: service.id, startAt: `${monday}T16:00`, notes: 'Reprogramada' });
    expect(moved.status).toBe(200);
    expect(moved.body.reservation).toMatchObject({ startAt: `${monday}T16:00`, notes: 'Reprogramada' });
    const keep = await api().put(`/api/business/reservations/${id}`).set(auth(biz.token)).send({ serviceId: service.id, startAt: `${monday}T16:30` });
    expect(keep.status).toBe(200); // se solapa consigo misma, pero se excluye
    const early = await api().patch(`/api/business/reservations/${id}/status`).set(auth(biz.token)).send({ status: 'COMPLETED' });
    expect(early.body.error.code).toBe('NOT_STARTED');
    const cancelled = await api().patch(`/api/business/reservations/${id}/status`).set(auth(biz.token)).send({ status: 'CANCELLED' });
    expect(cancelled.body.reservation).toMatchObject({ status: 'CANCELLED', cancelledBy: 'BUSINESS' });
    const reopen = await api().patch(`/api/business/reservations/${id}/status`).set(auth(biz.token)).send({ status: 'CONFIRMED' });
    expect(reopen.status).toBe(422);
  });

  it('filtra reservas por estado y fecha, y muestra el historial del cliente', async () => {
    const cancelled = await api().get('/api/business/reservations').query({ status: 'CANCELLED' }).set(auth(biz.token));
    expect(cancelled.body.reservations.every((r) => r.status === 'CANCELLED')).toBe(true);
    expect(cancelled.body.total).toBeGreaterThanOrEqual(2);
    const clients = await api().get('/api/business/clients?q=Carlos').set(auth(biz.token));
    const hist = await api().get(`/api/business/clients/${clients.body.clients[0].id}/reservations`).set(auth(biz.token));
    expect(hist.body.reservations).toHaveLength(1);
    const del = await api().delete(`/api/business/clients/${clients.body.clients[0].id}`).set(auth(biz.token));
    expect(del.status).toBe(409);
  });

  it('limita a 5 las reservas futuras activas de un cliente en el mismo negocio (anti-abuso)', async () => {
    const c = await registerClient();
    const wednesday = nextDate(3);
    const times = ['09:00', '10:00', '11:00', '12:00', '13:00'];
    for (const t of times) {
      const ok = await api().post('/api/client/reservations').set(auth(c.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt: `${wednesday}T${t}` });
      expect(ok.status).toBe(201);
    }
    const sixth = await api().post('/api/client/reservations').set(auth(c.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt: `${wednesday}T15:00` });
    expect(sixth.status).toBe(422);
    expect(sixth.body.error.code).toBe('TOO_MANY_ACTIVE_RESERVATIONS');
    const mine = await api().get('/api/client/reservations').set(auth(c.token));
    await api().patch(`/api/client/reservations/${mine.body.reservations[0].id}/cancel`).set(auth(c.token));
    const afterCancel = await api().post('/api/client/reservations').set(auth(c.token)).send({ businessSlug: biz.business.slug, serviceId: service.id, startAt: `${wednesday}T15:00` });
    expect(afterCancel.status).toBe(201);
    // El negocio no tiene este tope al agendar manualmente
    const byBusiness = await api().post('/api/business/reservations').set(auth(biz.token)).send({ serviceId: service.id, clientId: afterCancel.body.reservation.client.id, startAt: `${wednesday}T16:00` });
    expect(byBusiness.status).toBe(201);
  });

  it('marca como completada una cita pasada y la refleja en el panel', async () => {
    const svc = await prisma.service.findUnique({ where: { id: service.id } });
    const clientRow = await prisma.client.findFirst({ where: { businessId: biz.business.id } });
    const past = await prisma.reservation.create({
      data: { businessId: biz.business.id, serviceId: svc.id, clientId: clientRow.id, startAt: parseLocalDateTime('2026-01-05T10:00'), endAt: parseLocalDateTime('2026-01-05T11:00'), priceAtBooking: svc.price },
    });
    const done = await api().patch(`/api/business/reservations/${past.id}/status`).set(auth(biz.token)).send({ status: 'COMPLETED' });
    expect(done.status).toBe(200);
    const dash = await api().get('/api/business/dashboard').set(auth(biz.token));
    expect(dash.status).toBe(200);
    expect(dash.body.totals.clients).toBeGreaterThanOrEqual(2);
    expect(dash.body.totals.activeServices).toBe(1);
    expect(dash.body.upcoming.length).toBeGreaterThan(0);
    expect(dash.body.advanced).toBeNull(); // Plan Básico: sin estadísticas avanzadas
  });
});
