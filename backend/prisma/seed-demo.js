// DATOS DE DEMOSTRACIÓN (OPCIONALES) — solo para desarrollo local.
// Crea un negocio ficticio claramente identificado como "DEMO". No usar como
// evidencia de uso real ni ejecutar en producción.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-demo está deshabilitado en producción');
  }
  const plan = await prisma.plan.findUnique({ where: { code: 'BASICO' } });
  if (!plan) throw new Error('Primero ejecuta: npm run db:seed');
  const passwordHash = await bcrypt.hash('Demo12345', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'demo.negocio@agendafacil.local' },
    update: {},
    create: { email: 'demo.negocio@agendafacil.local', name: 'Administrador DEMO', role: 'BUSINESS_ADMIN', passwordHash },
  });
  const exists = await prisma.business.findUnique({ where: { ownerId: owner.id } });
  if (!exists) {
    await prisma.business.create({
      data: {
        ownerId: owner.id,
        name: 'Barbería DEMO',
        slug: 'barberia-demo',
        category: 'Barbería',
        description: 'Negocio de demostración para desarrollo local (no es un negocio real).',
        city: 'Ciudad DEMO',
        planId: plan.id,
        trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
        hours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, isOpen: d !== 0, openTime: '09:00', closeTime: d === 6 ? '14:00' : '19:00' })),
        },
        services: {
          create: [
            { name: 'Corte de cabello (DEMO)', durationMinutes: 30, price: 20000 },
            { name: 'Arreglo de barba (DEMO)', durationMinutes: 20, price: 12000 },
          ],
        },
      },
    });
  }
  await prisma.user.upsert({
    where: { email: 'demo.cliente@agendafacil.local' },
    update: {},
    create: { email: 'demo.cliente@agendafacil.local', name: 'Cliente DEMO', role: 'CLIENT', passwordHash },
  });
  console.log('Datos DEMO listos. Negocio: demo.negocio@agendafacil.local / Cliente: demo.cliente@agendafacil.local (contraseña Demo12345)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
