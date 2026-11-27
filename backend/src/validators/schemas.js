import { z } from 'zod';
import { isValidHHMM, isValidTimeZone, parseLocalDate, parseLocalDateTime } from '../lib/time.js';

// Concordancia de género en los mensajes: "La categoría es obligatoria".
const obligatorio = (label) => `${label} es ${/^(la|las)\s/i.test(label) ? 'obligatoria' : 'obligatorio'}`;

const trimmed = (min, max, label) =>
  z
    .string({ required_error: obligatorio(label), invalid_type_error: `${label} debe ser texto` })
    .trim()
    .min(min, `${label} debe tener al menos ${min} caracteres`)
    .max(max, `${label} no puede superar ${max} caracteres`);

const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label} no puede superar ${max} caracteres`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const emailSchema = z
  .string({ required_error: 'El correo es obligatorio' })
  .trim()
  .toLowerCase()
  .max(191)
  .email('Correo electrónico inválido');

export const passwordSchema = z
  .string({ required_error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres')
  .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
  .regex(/\d/, 'La contraseña debe contener al menos un número');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s()-]{6,29}$/, 'Teléfono inválido (solo dígitos, espacios, +, -, paréntesis)')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null))
  .transform((v) => (v ? v : null));

const optionalEmail = emailSchema.optional().nullable().or(z.literal('').transform(() => null)).transform((v) => v || null);

export const localDateTime = z
  .string({ required_error: 'La fecha y hora es obligatoria' })
  .refine((v) => parseLocalDateTime(v) !== null, 'Fecha y hora inválida (formato AAAA-MM-DDTHH:MM)');

export const localDate = z
  .string({ required_error: 'La fecha es obligatoria' })
  .refine((v) => parseLocalDate(v) !== null, 'Fecha inválida (formato AAAA-MM-DD)');

const id = z.coerce.number({ invalid_type_error: 'Identificador inválido' }).int().positive('Identificador inválido');

export const idParam = z.object({ id });

// ---------- Auth ----------
export const registerClientSchema = z.object({
  name: trimmed(2, 120, 'El nombre'),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
});

export const registerBusinessSchema = registerClientSchema.extend({
  business: z.object({
    name: trimmed(2, 120, 'El nombre del negocio'),
    category: trimmed(2, 60, 'La categoría'),
    phone: phoneSchema,
    address: optionalText(200, 'La dirección'),
    city: optionalText(80, 'La ciudad'),
    planCode: z.enum(['BASICO', 'PROFESIONAL']).default('BASICO'),
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria').max(72),
});

export const updateMeSchema = z.object({
  name: trimmed(2, 120, 'El nombre'),
  phone: phoneSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
  newPassword: passwordSchema,
});

// ---------- Negocio ----------
export const businessProfileSchema = z.object({
  name: trimmed(2, 120, 'El nombre del negocio'),
  category: trimmed(2, 60, 'La categoría'),
  description: optionalText(500, 'La descripción'),
  phone: phoneSchema,
  address: optionalText(200, 'La dirección'),
  city: optionalText(80, 'La ciudad'),
});

export const businessSettingsSchema = z.object({
  timezone: z.string().refine(isValidTimeZone, 'Zona horaria inválida'),
  slotIntervalMinutes: z.coerce.number().int().refine((v) => [10, 15, 20, 30, 45, 60].includes(v), 'Intervalo permitido: 10, 15, 20, 30, 45 o 60 minutos'),
  cancellationHours: z.coerce.number().int().min(0, 'Mínimo 0 horas').max(168, 'Máximo 168 horas (7 días)'),
});

export const planChangeSchema = z.object({ planCode: z.enum(['BASICO', 'PROFESIONAL']) });

export const serviceSchema = z.object({
  name: trimmed(2, 120, 'El nombre del servicio'),
  description: optionalText(500, 'La descripción'),
  durationMinutes: z.coerce
    .number({ invalid_type_error: 'La duración debe ser un número' })
    .int('La duración debe ser un número entero')
    .min(5, 'La duración mínima es 5 minutos')
    .max(480, 'La duración máxima es 480 minutos')
    .refine((v) => v % 5 === 0, 'La duración debe ser múltiplo de 5 minutos'),
  price: z.coerce.number({ invalid_type_error: 'El precio debe ser un número' }).min(0, 'El precio no puede ser negativo').max(99_999_999, 'Precio demasiado alto'),
  isActive: z.boolean().optional(),
});

const hourRow = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    openTime: z.string().refine(isValidHHMM, 'Hora inválida (HH:MM)'),
    closeTime: z.string().refine(isValidHHMM, 'Hora inválida (HH:MM)'),
  })
  .refine((h) => !h.isOpen || h.openTime < h.closeTime, { message: 'La hora de cierre debe ser posterior a la de apertura', path: ['closeTime'] });

export const hoursSchema = z.object({
  hours: z
    .array(hourRow)
    .length(7, 'Debes enviar los 7 días de la semana')
    .refine((rows) => new Set(rows.map((r) => r.dayOfWeek)).size === 7, 'Cada día de la semana debe aparecer una sola vez'),
});

export const clientSchema = z.object({
  name: trimmed(2, 120, 'El nombre'),
  email: optionalEmail,
  phone: phoneSchema,
  notes: optionalText(500, 'Las notas'),
});

const STATUSES = ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export const reservationQuerySchema = z.object({
  from: localDate.optional(),
  to: localDate.optional(),
  status: z.enum(STATUSES).optional(),
  clientId: id.optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const businessReservationSchema = z
  .object({
    serviceId: id,
    startAt: localDateTime,
    notes: optionalText(500, 'Las notas'),
    clientId: id.optional(),
    newClient: clientSchema.optional(),
  })
  .refine((v) => Boolean(v.clientId) !== Boolean(v.newClient), {
    message: 'Selecciona un cliente existente o registra uno nuevo',
    path: ['clientId'],
  });

export const updateReservationSchema = z.object({
  serviceId: id,
  startAt: localDateTime,
  notes: optionalText(500, 'Las notas'),
});

export const reservationStatusSchema = z.object({ status: z.enum(STATUSES) });

export const availabilityQuerySchema = z.object({
  serviceId: id,
  date: localDate,
  excludeReservationId: id.optional(),
});

// ---------- Cliente ----------
export const clientReservationSchema = z.object({
  businessSlug: z.string().trim().min(1).max(140),
  serviceId: id,
  startAt: localDateTime,
  notes: optionalText(500, 'Las notas'),
});

export const clientReservationQuerySchema = z.object({
  scope: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
});

export const publicBusinessQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
});
