import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ah } from '../../lib/asyncHandler.js';
import { money, serializeReservation } from '../../lib/serialize.js';
import { addDays, formatLocalDate, nowInZone, startOfLocalDay } from '../../lib/time.js';
import { reservationInclude } from '../../services/reservations.js';

export const dashboardRouter = Router();

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

dashboardRouter.get(
  '/',
  ah(async (req, res) => {
    const business = req.business;
    const businessId = business.id;
    const now = nowInZone(business.timezone);
    const today = startOfLocalDay(now);
    const tomorrow = addDays(today, 1);
    const last30 = addDays(today, -30);

    const [todayReservations, upcoming, totalClients, activeServices, next7Count, statusGroups, revenue] = await Promise.all([
      prisma.reservation.findMany({
        where: { businessId, startAt: { gte: today, lt: tomorrow } },
        include: reservationInclude,
        orderBy: { startAt: 'asc' },
      }),
      prisma.reservation.findMany({
        where: { businessId, status: 'CONFIRMED', startAt: { gt: now } },
        include: reservationInclude,
        orderBy: { startAt: 'asc' },
        take: 6,
      }),
      prisma.client.count({ where: { businessId } }),
      prisma.service.count({ where: { businessId, isActive: true } }),
      prisma.reservation.count({ where: { businessId, status: 'CONFIRMED', startAt: { gte: today, lt: addDays(today, 7) } } }),
      prisma.reservation.groupBy({ by: ['status'], where: { businessId, startAt: { gte: last30, lt: tomorrow } }, _count: { _all: true } }),
      prisma.reservation.aggregate({ where: { businessId, status: 'COMPLETED', startAt: { gte: last30, lt: tomorrow } }, _sum: { priceAtBooking: true } }),
    ]);

    const byStatus = { CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 };
    statusGroups.forEach((g) => (byStatus[g.status] = g._count._all));

    let advanced = null;
    if (business.plan?.advancedStats) {
      const recent = await prisma.reservation.findMany({
        where: { businessId, startAt: { gte: last30, lt: tomorrow }, status: { not: 'CANCELLED' } },
        select: { startAt: true, service: { select: { name: true } } },
      });
      const services = new Map();
      const weekdays = DAY_NAMES.map((name) => ({ day: name, count: 0 }));
      recent.forEach((r) => {
        services.set(r.service.name, (services.get(r.service.name) || 0) + 1);
        weekdays[r.startAt.getUTCDay()].count += 1;
      });
      const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
      advanced = {
        topServices: [...services.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
        byWeekday: weekdays,
        cancellationRate: total ? Math.round((byStatus.CANCELLED / total) * 100) : 0,
      };
    }

    res.json({
      date: formatLocalDate(today),
      today: {
        total: todayReservations.filter((r) => r.status !== 'CANCELLED').length,
        pending: todayReservations.filter((r) => r.status === 'CONFIRMED' && r.startAt > now).length,
        reservations: todayReservations.map(serializeReservation),
      },
      upcoming: upcoming.map(serializeReservation),
      totals: { clients: totalClients, activeServices, next7Days: next7Count },
      last30Days: { byStatus, completedRevenue: money(revenue._sum.priceAtBooking) ?? 0 },
      advanced,
    });
  }),
);
