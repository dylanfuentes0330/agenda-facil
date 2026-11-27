import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { api, auth, PASSWORD, registerBusiness, registerClient, uniqueEmail } from '../helpers.js';
import { prisma } from '../../src/lib/prisma.js';

describe('Registro e inicio de sesión', () => {
  it('registra un negocio con plan, periodo de prueba y horario inicial', async () => {
    const { business, user, token } = await registerBusiness({ businessName: 'Barbería Central' });
    expect(user.role).toBe('BUSINESS_ADMIN');
    expect(business.slug).toMatch(/^barberia-central/);
    expect(business.plan.code).toBe('BASICO');
    expect(new Date(business.trialEndsAt) > new Date()).toBe(true);
    const hours = await api().get('/api/business/hours').set(auth(token));
    expect(hours.status).toBe(200);
    expect(hours.body.hours).toHaveLength(7);
  });

  it('guarda la contraseña cifrada con bcrypt (nunca en texto plano)', async () => {
    const { email } = await registerClient();
    const row = await prisma.user.findUnique({ where: { email } });
    expect(row.passwordHash).not.toBe(PASSWORD);
    expect(row.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('impide registrar dos cuentas con el mismo correo', async () => {
    const { email } = await registerClient();
    const res = await api().post('/api/auth/register/client').send({ name: 'Otra', email, password: PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('valida los datos de registro', async () => {
    const res = await api().post('/api/auth/register/client').send({ name: 'A', email: 'no-es-correo', password: 'corta' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('inicia sesión con credenciales correctas y rechaza las incorrectas', async () => {
    const { email } = await registerClient();
    const ok = await api().post('/api/auth/login').send({ email: email.toUpperCase(), password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    expect(ok.body.user.role).toBe('CLIENT');
    const bad = await api().post('/api/auth/login').send({ email, password: 'Incorrecta123' });
    expect(bad.status).toBe(401);
    const unknown = await api().post('/api/auth/login').send({ email: uniqueEmail('nadie'), password: PASSWORD });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.message).toBe(bad.body.error.message);
  });

  it('devuelve el perfil con /me y rechaza tokens inválidos', async () => {
    const { token } = await registerClient();
    expect((await api().get('/api/auth/me').set(auth(token))).status).toBe(200);
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set(auth('token.falso.123'))).status).toBe(401);
  });

  it('permite actualizar el perfil y cambiar la contraseña', async () => {
    const { token, email } = await registerClient();
    const upd = await api().put('/api/auth/me').set(auth(token)).send({ name: 'Nombre Nuevo', phone: '3001234567' });
    expect(upd.status).toBe(200);
    expect(upd.body.user.name).toBe('Nombre Nuevo');
    const wrong = await api().put('/api/auth/password').set(auth(token)).send({ currentPassword: 'malamala1', newPassword: 'NuevaClave99' });
    expect(wrong.status).toBe(401);
    const ok = await api().put('/api/auth/password').set(auth(token)).send({ currentPassword: PASSWORD, newPassword: 'NuevaClave99' });
    expect(ok.status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email, password: 'NuevaClave99' })).status).toBe(200);
  });

  it('aplica rate limiting en los endpoints de autenticación', async () => {
    const limited = createApp({ authRateLimitMax: 3 });
    const attempt = () => request(limited).post('/api/auth/login').send({ email: 'x@pruebas.test', password: 'Nada12345' });
    for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});

describe('API general', () => {
  it('responde el health check con estado de la base de datos', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('devuelve 404 JSON para rutas inexistentes y 400 para JSON inválido', async () => {
    expect((await api().get('/api/no-existe')).status).toBe(404);
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('aplica cabeceras de seguridad y CORS solo para orígenes permitidos', async () => {
    const allowed = await api().get('/api/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const denied = await api().get('/api/health').set('Origin', 'https://sitio-malicioso.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    expect(allowed.headers['x-powered-by']).toBeUndefined();
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
  });

  it('lista los planes Básico y Profesional', async () => {
    const res = await api().get('/api/public/plans');
    expect(res.body.plans.map((p) => p.code)).toEqual(['BASICO', 'PROFESIONAL']);
  });
});
