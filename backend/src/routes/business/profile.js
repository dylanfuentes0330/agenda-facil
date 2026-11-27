import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../../lib/prisma.js';
import { ah } from '../../lib/asyncHandler.js';
import { badRequest, unprocessable } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { serializeBusinessPrivate, serializeHours } from '../../lib/business.js';
import { deleteFile, detectImageType, saveLogo } from '../../lib/storage.js';
import { businessProfileSchema, businessSettingsSchema, hoursSchema, planChangeSchema } from '../../validators/schemas.js';

export const profileRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

const reload = (id) => prisma.business.findUnique({ where: { id }, include: { plan: true } });

profileRouter.get('/profile', ah(async (req, res) => res.json({ business: await serializeBusinessPrivate(req.business) })));

profileRouter.put(
  '/profile',
  validate({ body: businessProfileSchema }),
  ah(async (req, res) => {
    await prisma.business.update({ where: { id: req.business.id }, data: req.body });
    res.json({ business: await serializeBusinessPrivate(await reload(req.business.id)) });
  }),
);

profileRouter.put(
  '/settings',
  validate({ body: businessSettingsSchema }),
  ah(async (req, res) => {
    await prisma.business.update({ where: { id: req.business.id }, data: req.body });
    res.json({ business: await serializeBusinessPrivate(await reload(req.business.id)) });
  }),
);

// Cambio de nivel de plan. NO hay pasarela de pago: solo cambia los límites funcionales.
profileRouter.put(
  '/plan',
  validate({ body: planChangeSchema }),
  ah(async (req, res) => {
    const plan = await prisma.plan.findUnique({ where: { code: req.body.planCode } });
    if (plan.maxServices != null) {
      const count = await prisma.service.count({ where: { businessId: req.business.id } });
      if (count > plan.maxServices) {
        throw unprocessable('PLAN_LIMIT', `Tienes ${count} servicios y el ${plan.name} permite ${plan.maxServices}. Elimina servicios antes de cambiar.`);
      }
    }
    if (plan.maxClients != null) {
      const count = await prisma.client.count({ where: { businessId: req.business.id } });
      if (count > plan.maxClients) {
        throw unprocessable('PLAN_LIMIT', `Tienes ${count} clientes y el ${plan.name} permite ${plan.maxClients}.`);
      }
    }
    await prisma.business.update({ where: { id: req.business.id }, data: { planId: plan.id } });
    res.json({ business: await serializeBusinessPrivate(await reload(req.business.id)) });
  }),
);

profileRouter.post(
  '/logo',
  upload.single('logo'),
  ah(async (req, res) => {
    if (!req.file) throw badRequest('Adjunta una imagen en el campo "logo"');
    const type = detectImageType(req.file.buffer, req.file.mimetype);
    if (!type) throw badRequest('Formato no permitido. Usa PNG, JPG o WEBP.');
    const key = await saveLogo(req.business.id, req.file.buffer, req.file.mimetype, type.ext);
    const previous = req.business.logoKey;
    await prisma.business.update({ where: { id: req.business.id }, data: { logoKey: key } });
    await deleteFile(previous);
    res.json({ business: await serializeBusinessPrivate(await reload(req.business.id)) });
  }),
);

profileRouter.delete(
  '/logo',
  ah(async (req, res) => {
    await deleteFile(req.business.logoKey);
    await prisma.business.update({ where: { id: req.business.id }, data: { logoKey: null } });
    res.json({ business: await serializeBusinessPrivate(await reload(req.business.id)) });
  }),
);

profileRouter.get(
  '/hours',
  ah(async (req, res) => {
    const hours = await prisma.businessHour.findMany({ where: { businessId: req.business.id } });
    res.json({ hours: serializeHours(hours) });
  }),
);

profileRouter.put(
  '/hours',
  validate({ body: hoursSchema }),
  ah(async (req, res) => {
    const businessId = req.business.id;
    await prisma.$transaction(
      req.body.hours.map((h) =>
        prisma.businessHour.upsert({
          where: { businessId_dayOfWeek: { businessId, dayOfWeek: h.dayOfWeek } },
          create: { businessId, ...h },
          update: { isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime },
        }),
      ),
    );
    const hours = await prisma.businessHour.findMany({ where: { businessId } });
    res.json({ hours: serializeHours(hours) });
  }),
);
