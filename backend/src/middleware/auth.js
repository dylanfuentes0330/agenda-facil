import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    issuer: 'agenda-facil',
    audience: 'agenda-facil-web',
  });
}

/** Verifica el JWT y carga el usuario (y su negocio) desde la base de datos. */
export async function authenticate(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized();
    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret, { issuer: 'agenda-facil', audience: 'agenda-facil-web' });
    } catch {
      throw unauthorized('La sesión expiró o no es válida. Inicia sesión de nuevo.');
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      include: { business: { include: { plan: true } } },
    });
    if (!user) throw unauthorized('La cuenta ya no existe');
    req.user = user;
    // Aislamiento multi-tenant: el negocio SIEMPRE sale del usuario autenticado,
    // nunca de un parámetro enviado por el cliente.
    req.business = user.business ?? null;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  if (req.user.role === 'BUSINESS_ADMIN' && !req.business) return next(forbidden('La cuenta no tiene un negocio asociado'));
  return next();
};
