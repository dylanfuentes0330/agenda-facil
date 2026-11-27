import { describe, expect, it } from 'vitest';
import { formatLocalDateTime, nowInZone, parseLocalDate, parseLocalDateTime, isValidHHMM, isValidTimeZone } from '../../src/lib/time.js';
import { slugify } from '../../src/lib/slug.js';
import { assertProductionSecret } from '../../src/config/env.js';

describe('utilidades de tiempo', () => {
  it('parsea y formatea fecha-hora local sin depender de la zona del servidor', () => {
    const d = parseLocalDateTime('2026-12-01T09:30');
    expect(d.toISOString()).toBe('2026-12-01T09:30:00.000Z');
    expect(formatLocalDateTime(d)).toBe('2026-12-01T09:30');
  });

  it('rechaza fechas inexistentes o mal formadas', () => {
    expect(parseLocalDateTime('2026-02-30T10:00')).toBeNull();
    expect(parseLocalDateTime('2026-12-01 10:00')).toBeNull();
    expect(parseLocalDate('2026-13-01')).toBeNull();
    expect(isValidHHMM('24:00')).toBe(false);
    expect(isValidHHMM('08:15')).toBe(true);
  });

  it('calcula la hora local de una zona horaria', () => {
    const ref = new Date('2026-06-15T15:00:00Z');
    expect(formatLocalDateTime(nowInZone('America/Bogota', ref))).toBe('2026-06-15T10:00');
    expect(formatLocalDateTime(nowInZone('Europe/Madrid', ref))).toBe('2026-06-15T17:00');
    expect(isValidTimeZone('America/Lima')).toBe(true);
    expect(isValidTimeZone('Marte/Base')).toBe(false);
  });

  it('genera slugs sin tildes ni símbolos', () => {
    expect(slugify('Peluquería Ñandú & Café')).toBe('peluqueria-nandu-cafe');
  });
});

describe('secreto JWT en producción', () => {
  it('rechaza secretos cortos o de ejemplo y acepta uno aleatorio', () => {
    expect(() => assertProductionSecret('corto', true)).toThrow(/32 caracteres/);
    expect(() => assertProductionSecret('CAMBIAR_POR_UN_SECRETO_LARGO_Y_ALEATORIO', true)).toThrow(/ejemplo/);
    expect(() => assertProductionSecret('test-secret-for-automated-tests-only-0123456789', true)).toThrow(/ejemplo/);
    expect(() => assertProductionSecret('9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e', true)).not.toThrow();
    expect(() => assertProductionSecret('corto', false)).not.toThrow();
  });
});
