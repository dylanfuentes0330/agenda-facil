// Datos de referencia obligatorios: los dos planes del modelo de negocio.
// No incluye precios: la propuesta original no los define y no hay pasarela de pago.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    code: 'BASICO',
    name: 'Plan Básico',
    description: 'Funciones esenciales de agenda y reservas para negocios pequeños.',
    maxServices: 10,
    maxClients: 300,
    advancedStats: false,
    trialDays: 14,
  },
  {
    code: 'PROFESIONAL',
    name: 'Plan Profesional',
    description: 'Sin límite de servicios ni clientes y estadísticas de rendimiento.',
    maxServices: null,
    maxClients: null,
    advancedStats: true,
    trialDays: 14,
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({ where: { code: plan.code }, update: plan, create: plan });
  }
  console.log(`Planes listos: ${plans.map((p) => p.code).join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
