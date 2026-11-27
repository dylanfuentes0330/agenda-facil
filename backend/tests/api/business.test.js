import { describe, expect, it } from 'vitest';
import { api, auth, createService, registerBusiness, registerClient } from '../helpers.js';

const week = (overrides = {}) =>
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, isOpen: d !== 0, openTime: '08:00', closeTime: '17:00', ...(overrides[d] || {}) }));

describe('Autorización por roles', () => {
  it('un cliente no puede usar endpoints del negocio y un negocio no puede reservar como cliente', async () => {
    const client = await registerClient();
    const biz = await registerBusiness();
    expect((await api().get('/api/business/services').set(auth(client.token))).status).toBe(403);
    expect((await api().get('/api/client/reservations').set(auth(biz.token))).status).toBe(403);
    expect((await api().get('/api/business/dashboard')).status).toBe(401);
  });
});

describe('Gestión de servicios', () => {
  it('crea, consulta, edita y elimina servicios', async () => {
    const { token } = await registerBusiness();
    const created = await createService(token, { name: 'Corte clásico', durationMinutes: 45, price: 30000 });
    expect(created).toMatchObject({ name: 'Corte clásico', durationMinutes: 45, price: 30000, isActive: true });
    const list = await api().get('/api/business/services').set(auth(token));
    expect(list.body.services).toHaveLength(1);
    const upd = await api().put(`/api/business/services/${created.id}`).set(auth(token)).send({ name: 'Corte premium', durationMinutes: 60, price: 45000.5, isActive: false });
    expect(upd.status).toBe(200);
    expect(upd.body.service).toMatchObject({ name: 'Corte premium', price: 45000.5, isActive: false });
    const del = await api().delete(`/api/business/services/${created.id}`).set(auth(token));
    expect(del.body.result).toBe('deleted');
    expect((await api().get(`/api/business/services/${created.id}`).set(auth(token))).status).toBe(404);
  });

  it('valida duración, precio y nombres duplicados', async () => {
    const { token } = await registerBusiness();
    const bad = await api().post('/api/business/services').set(auth(token)).send({ name: 'X', durationMinutes: 7, price: -5 });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['name', 'durationMinutes', 'price']));
    await createService(token, { name: 'Manicure' });
    const dup = await api().post('/api/business/services').set(auth(token)).send({ name: 'Manicure', durationMinutes: 30, price: 1 });
    expect(dup.status).toBe(409);
  });

  it('aplica el límite de servicios del Plan Básico y lo amplía con el Profesional', async () => {
    const { token } = await registerBusiness();
    for (let i = 0; i < 10; i += 1) await createService(token, { name: `S${i}` });
    const over = await api().post('/api/business/services').set(auth(token)).send({ name: 'S10', durationMinutes: 30, price: 1 });
    expect(over.status).toBe(422);
    expect(over.body.error.code).toBe('PLAN_LIMIT');
    const plan = await api().put('/api/business/plan').set(auth(token)).send({ planCode: 'PROFESIONAL' });
    expect(plan.body.business.plan.code).toBe('PROFESIONAL');
    expect((await api().post('/api/business/services').set(auth(token)).send({ name: 'S10', durationMinutes: 30, price: 1 })).status).toBe(201);
    const back = await api().put('/api/business/plan').set(auth(token)).send({ planCode: 'BASICO' });
    expect(back.status).toBe(422);
  });
});

describe('Horarios y configuración', () => {
  it('guarda el horario semanal y valida rangos', async () => {
    const { token } = await registerBusiness();
    const ok = await api().put('/api/business/hours').set(auth(token)).send({ hours: week({ 6: { openTime: '09:00', closeTime: '13:00' } }) });
    expect(ok.status).toBe(200);
    expect(ok.body.hours[6]).toMatchObject({ dayName: 'Sábado', isOpen: true, openTime: '09:00', closeTime: '13:00' });
    expect(ok.body.hours[0].isOpen).toBe(false);
    const bad = await api().put('/api/business/hours').set(auth(token)).send({ hours: week({ 1: { openTime: '18:00', closeTime: '09:00' } }) });
    expect(bad.status).toBe(400);
    const incomplete = await api().put('/api/business/hours').set(auth(token)).send({ hours: week().slice(0, 5) });
    expect(incomplete.status).toBe(400);
  });

  it('actualiza perfil y configuración del negocio', async () => {
    const { token } = await registerBusiness();
    const prof = await api().put('/api/business/profile').set(auth(token)).send({ name: 'Estética Luz', category: 'Centro de estética', description: 'Cuidado facial', address: 'Calle 1 # 2-3', city: 'Medellín', phone: '6041234567' });
    expect(prof.status).toBe(200);
    expect(prof.body.business).toMatchObject({ name: 'Estética Luz', city: 'Medellín' });
    const set = await api().put('/api/business/settings').set(auth(token)).send({ timezone: 'America/Lima', slotIntervalMinutes: 15, cancellationHours: 24 });
    expect(set.body.business).toMatchObject({ timezone: 'America/Lima', slotIntervalMinutes: 15, cancellationHours: 24 });
    const bad = await api().put('/api/business/settings').set(auth(token)).send({ timezone: 'Nada/Nada', slotIntervalMinutes: 7, cancellationHours: -1 });
    expect(bad.status).toBe(400);
  });

  it('sube un logo validando el tipo real del archivo', async () => {
    const { token } = await registerBusiness();
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
    const ok = await api().post('/api/business/logo').set(auth(token)).attach('logo', png, { filename: 'logo.png', contentType: 'image/png' });
    expect(ok.status).toBe(200);
    expect(ok.body.business.logoUrl).toMatch(/^\/uploads\/logos\//);
    const fake = await api().post('/api/business/logo').set(auth(token)).attach('logo', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
  });
});

describe('Gestión de clientes', () => {
  it('registra, consulta, busca, edita y elimina clientes', async () => {
    const { token } = await registerBusiness();
    const c = await api().post('/api/business/clients').set(auth(token)).send({ name: 'Ana Gómez', email: 'ana@pruebas.test', phone: '3101112233', notes: 'Prefiere la mañana' });
    expect(c.status).toBe(201);
    const dup = await api().post('/api/business/clients').set(auth(token)).send({ name: 'Ana 2', email: 'ana@pruebas.test' });
    expect(dup.status).toBe(409);
    const search = await api().get('/api/business/clients?q=Gómez').set(auth(token));
    expect(search.body.clients).toHaveLength(1);
    const upd = await api().put(`/api/business/clients/${c.body.client.id}`).set(auth(token)).send({ name: 'Ana María Gómez', email: 'ana@pruebas.test', phone: '3101112233' });
    expect(upd.body.client.name).toBe('Ana María Gómez');
    const hist = await api().get(`/api/business/clients/${c.body.client.id}/reservations`).set(auth(token));
    expect(hist.body.reservations).toEqual([]);
    expect((await api().delete(`/api/business/clients/${c.body.client.id}`).set(auth(token))).status).toBe(200);
  });
});
