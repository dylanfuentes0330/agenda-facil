import { describe, expect, it } from 'vitest';
import { formatLocalDateTime, nowInZone, parseLocalDate, parseLocalDateTime, isValidHHMM, isValidTimeZone } from '../../src/lib/time.js';
import { slugify } from '../../src/lib/slug.js';

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
