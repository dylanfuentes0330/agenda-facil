import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ah } from '../lib/asyncHandler.js';
import { conflict, unauthorized, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { serializeUser } from '../lib/serialize.js';
import { defaultHours, serializeBusinessPrivate } from '../lib/business.js';
import { uniqueBusinessSlug } from '../lib/slug.js';
import { addDays } from '../lib/time.js';
import {
  changePasswordSchema,
  loginSchema,
  registerBusinessSchema,
  registerClientSchema,
  updateMeSchema,
} from '../validators/schemas.js';

// Hash fijo para comparar cuando el correo no existe (evita enumeración por tiempo de respuesta).
const DUMMY_HASH = bcrypt.hashSync('agenda-facil-dummy-password', 10);

async function sessionPayload(user) {
  const full = await prisma.user.findUnique({ where: { id: user.id }, include: { business: { include: { plan: true } } } });
  return {
    token: signToken(full),
    user: serializeUser(full),
    business: full.business ? await serializeBusinessPrivate(full.business) : null,
  };
}

async function ensureEmailFree(email) {
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw conflict('EMAIL_IN_USE', 'Ya existe una cuenta con ese correo electrónico');
}

export function authRouter({ authLimiter }) {
  const router = Router();

  router.post(
    '/register/business',
    authLimiter,
    validate({ body: registerBusinessSchema }),
    ah(async (req, res) => {
      const { name, email, password, phone, business } = req.body;
      await ensureEmailFree(email);
      const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
      const user = await prisma.$transaction(async (tx) => {
        const plan = await tx.plan.findUnique({ where: { code: business.planCode } });
        if (!plan) throw notFound('El plan seleccionado no existe. Ejecuta el seed de planes.');
        const created = await tx.user.create({ data: { name, email, phone, passwordHash, role: 'BUSINESS_ADMIN' } });
        await tx.business.create({
          data: {
            ownerId: created.id,
            name: business.name,
            slug: await uniqueBusinessSlug(tx, business.name),
            category: business.category,
            phone: business.phone ?? phone,
            address: business.address,
            city: business.city,
            planId: plan.id,
            trialEndsAt: addDays(new Date(), plan.trialDays),
            hours: { create: defaultHours() },
          },
        });
        return created;
      });
      res.status(201).json(await sessionPayload(user));
    }),
  );

  router.post(
    '/register/client',
    authLimiter,
    validate({ body: registerClientSchema }),
    ah(async (req, res) => {
      const { name, email, password, phone } = req.body;
      await ensureEmailFree(email);
      const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
      const user = await prisma.user.create({ data: { name, email, phone, passwordHash, role: 'CLIENT' } });
      res.status(201).json(await sessionPayload(user));
    }),
  );

  router.post(
    '/login',
    authLimiter,
    validate({ body: loginSchema }),
    ah(async (req, res) => {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !ok) throw unauthorized('Correo o contraseña incorrectos');
      res.json(await sessionPayload(user));
    }),
  );

  router.get(
    '/me',
    authenticate,
    ah(async (req, res) => {
      res.json({
        user: serializeUser(req.user),
        business: req.business ? await serializeBusinessPrivate(req.business) : null,
      });
    }),
  );

  router.put(
    '/me',
    authenticate,
    validate({ body: updateMeSchema }),
    ah(async (req, res) => {
      const user = await prisma.user.update({ where: { id: req.user.id }, data: req.body });
      res.json({ user: serializeUser(user) });
    }),
  );

  router.put(
    '/password',
    authLimiter,
    authenticate,
    validate({ body: changePasswordSchema }),
    ah(async (req, res) => {
      const ok = await bcrypt.compare(req.body.currentPassword, req.user.passwordHash);
      if (!ok) throw unauthorized('La contraseña actual no es correcta');
      await prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash: await bcrypt.hash(req.body.newPassword, env.bcryptRounds) },
      });
      res.json({ message: 'Contraseña actualizada' });
    }),
  );

  return router;
}
