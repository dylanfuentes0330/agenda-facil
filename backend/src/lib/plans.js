import { unprocessable } from './errors.js';

export async function assertPlanLimit(tx, business, kind) {
  const plan = business.plan ?? (await tx.plan.findUnique({ where: { id: business.planId } }));
  const limit = kind === 'services' ? plan.maxServices : plan.maxClients;
  if (limit == null) return;
  const count =
    kind === 'services'
      ? await tx.service.count({ where: { businessId: business.id } })
      : await tx.client.count({ where: { businessId: business.id } });
  if (count >= limit) {
    const label = kind === 'services' ? 'servicios' : 'clientes';
    throw unprocessable('PLAN_LIMIT', `Tu plan ${plan.name} permite hasta ${limit} ${label}. Cambia al Plan Profesional para ampliar el límite.`);
  }
}
