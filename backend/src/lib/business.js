import { fileUrl } from './storage.js';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function serializeHours(hours) {
  return [...hours]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((h) => ({ dayOfWeek: h.dayOfWeek, dayName: DAY_NAMES[h.dayOfWeek], isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime }));
}

export async function serializeBusinessPublic(b) {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    category: b.category,
    description: b.description,
    phone: b.phone,
    address: b.address,
    city: b.city,
    timezone: b.timezone,
    cancellationHours: b.cancellationHours,
    logoUrl: await fileUrl(b.logoKey),
  };
}

export async function serializeBusinessPrivate(b) {
  return {
    ...(await serializeBusinessPublic(b)),
    slotIntervalMinutes: b.slotIntervalMinutes,
    isActive: b.isActive,
    trialEndsAt: b.trialEndsAt,
    plan: b.plan
      ? {
          code: b.plan.code,
          name: b.plan.name,
          description: b.plan.description,
          maxServices: b.plan.maxServices,
          maxClients: b.plan.maxClients,
          advancedStats: b.plan.advancedStats,
        }
      : undefined,
  };
}

// Horario inicial sugerido; el negocio debe revisarlo y ajustarlo en "Horarios".
export function defaultHours() {
  return [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    dayOfWeek: d,
    isOpen: d >= 1 && d <= 5,
    openTime: '09:00',
    closeTime: '18:00',
  }));
}
