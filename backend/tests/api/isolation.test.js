import { beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createService, nextDate, registerBusiness, registerClient } from '../helpers.js';

describe('Aislamiento multi-tenant entre negocios', () => {
  let a;
  let b;
  let serviceA;
  let clientA;
  let reservationA;

  beforeAll(async () => {
    a = await registerBusiness({ businessName: 'Negocio A' });
    b = await registerBusiness({ businessName: 'Negocio B', planCode: 'PROFESIONAL' });
    serviceA = await createService(a.token, { name: 'Servicio privado A' });
    clientA = (await api().post('/api/business/clients').set(auth(a.token)).send({ name: 'Cliente de A', email: 'privado@pruebas.test' })).body.client;
    reservationA = (
      await api().post('/api/business/reservations').set(auth(a.token)).send({ serviceId: serviceA.id, clientId: clientA.id, startAt: `${nextDate(3)}T11:00` })
    ).body.reservation;
  });

  it('B no puede leer ni modificar servicios de A', async () => {
    expect((await api().get(`/api/business/services/${serviceA.id}`).set(auth(b.token))).status).toBe(404);
    expect((await api().put(`/api/business/services/${serviceA.id}`).set(auth(b.token)).send({ name: 'Hackeado', durationMinutes: 30, price: 0 })).status).toBe(404);
    expect((await api().delete(`/api/business/services/${serviceA.id}`).set(auth(b.token))).status).toBe(404);
    const listB = await api().get('/api/business/services').set(auth(b.token));
    expect(listB.body.services).toEqual([]);
  });

  it('B no puede ver ni editar clientes de A', async () => {
    expect((await api().get(`/api/business/clients/${clientA.id}`).set(auth(b.token))).status).toBe(404);
    expect((await api().get(`/api/business/clients/${clientA.id}/reservations`).set(auth(b.token))).status).toBe(404);
    expect((await api().put(`/api/business/clients/${clientA.id}`).set(auth(b.token)).send({ name: 'X Y' })).status).toBe(404);
    expect((await api().get('/api/business/clients?q=privado').set(auth(b.token))).body.clients).toEqual([]);
  });

  it('B no puede ver, mover ni cancelar reservas de A, ni usar sus servicios o clientes', async () => {
    expect((await api().get(`/api/business/reservations/${reservationA.id}`).set(auth(b.token))).status).toBe(404);
    expect((await api().patch(`/api/business/reservations/${reservationA.id}/status`).set(auth(b.token)).send({ status: 'CANCELLED' })).status).toBe(404);
    expect((await api().put(`/api/business/reservations/${reservationA.id}`).set(auth(b.token)).send({ serviceId: serviceA.id, startAt: `${nextDate(3)}T12:00` })).status).toBe(404);
    const serviceB = await createService(b.token);
    const useClientA = await api().post('/api/business/reservations').set(auth(b.token)).send({ serviceId: serviceB.id, clientId: clientA.id, startAt: `${nextDate(3)}T11:00` });
    expect(useClientA.status).toBe(404);
    const useServiceA = await api().post('/api/business/reservations').set(auth(b.token)).send({ serviceId: serviceA.id, newClient: { name: 'Z Z' }, startAt: `${nextDate(3)}T11:00` });
    expect(useServiceA.status).toBe(404);
    expect((await api().get('/api/business/reservations').set(auth(b.token))).body.reservations).toEqual([]);
  });

  it('los horarios de A no se ven afectados por la agenda de B', async () => {
    const serviceB = (await api().get('/api/business/services').set(auth(b.token))).body.services[0];
    const res = await api().post('/api/business/reservations').set(auth(b.token)).send({ serviceId: serviceB.id, newClient: { name: 'Cliente B' }, startAt: `${nextDate(3)}T11:00` });
    expect(res.status).toBe(201); // misma hora que A, pero otro negocio → permitido
  });

  it('un cliente no puede cancelar reservas que no son suyas', async () => {
    const intruder = await registerClient();
    expect((await api().patch(`/api/client/reservations/${reservationA.id}/cancel`).set(auth(intruder.token))).status).toBe(404);
  });

  it('el Plan Profesional incluye estadísticas avanzadas', async () => {
    const dash = await api().get('/api/business/dashboard').set(auth(b.token));
    expect(dash.body.advanced).not.toBeNull();
    expect(dash.body.advanced.byWeekday).toHaveLength(7);
  });
});
