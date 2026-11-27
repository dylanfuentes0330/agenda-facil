import request from 'supertest';
import { createApp } from '../src/app.js';
import { addDays, formatLocalDate, nowInZone } from '../src/lib/time.js';

export const app = createApp();
export const api = () => request(app);

let seq = 0;
export const uniqueEmail = (prefix = 'user') => `${prefix}.${Date.now()}.${seq++}@pruebas.test`;

export const PASSWORD = 'Clave12345';

export async function registerBusiness(overrides = {}) {
  const email = overrides.email || uniqueEmail('negocio');
  const res = await api()
    .post('/api/auth/register/business')
    .send({
      name: 'Dueño Prueba',
      email,
      password: PASSWORD,
      phone: '+57 300 000 0000',
      business: { name: overrides.businessName || `Negocio ${seq}`, category: 'Barbería', city: 'Ciudad', planCode: overrides.planCode || 'BASICO' },
    });
  if (res.status !== 201) throw new Error(`registerBusiness falló: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user, business: res.body.business, email };
}

export async function registerClient() {
  const email = uniqueEmail('cliente');
  const res = await api().post('/api/auth/register/client').send({ name: 'Cliente Prueba', email, password: PASSWORD });
  if (res.status !== 201) throw new Error(`registerClient falló: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user, email };
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

export async function createService(token, data = {}) {
  const res = await api()
    .post('/api/business/services')
    .set(auth(token))
    .send({ name: `Servicio ${seq++}`, durationMinutes: 30, price: 25000, ...data });
  if (res.status !== 201) throw new Error(`createService falló: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.service;
}

/** Próxima fecha (AAAA-MM-DD) con el día de la semana indicado, al menos `minDays` días en el futuro. */
export function nextDate(dayOfWeek, minDays = 2, tz = 'America/Bogota') {
  let d = addDays(nowInZone(tz), minDays);
  while (d.getUTCDay() !== dayOfWeek) d = addDays(d, 1);
  return formatLocalDate(d);
}
