import { describe, expect, it } from 'vitest';
import { checkSlotRules, computeSlots } from '../../src/services/availability.js';
import { parseLocalDate, parseLocalDateTime } from '../../src/lib/time.js';

const hours = { isOpen: true, openTime: '09:00', closeTime: '12:00' };
const day = parseLocalDate('2026-12-01');
const now = parseLocalDateTime('2026-11-30T08:00');

describe('computeSlots', () => {
  it('genera franjas dentro del horario según duración e intervalo', () => {
    const slots = computeSlots({ day, hours, durationMinutes: 60, intervalMinutes: 30, busy: [], now });
    expect(slots.map((s) => s.time)).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00']);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('marca como ocupadas las franjas que se solapan con reservas', () => {
    const busy = [{ startAt: parseLocalDateTime('2026-12-01T10:00'), endAt: parseLocalDateTime('2026-12-01T10:30') }];
    const slots = computeSlots({ day, hours, durationMinutes: 60, intervalMinutes: 30, busy, now });
    const byTime = Object.fromEntries(slots.map((s) => [s.time, s.available]));
    expect(byTime).toEqual({ '09:00': true, '09:30': false, '10:00': false, '10:30': true, '11:00': true });
  });

  it('no ofrece franjas en el pasado ni en días cerrados', () => {
    const late = parseLocalDateTime('2026-12-01T10:15');
    const slots = computeSlots({ day, hours, durationMinutes: 30, intervalMinutes: 30, busy: [], now: late });
    expect(slots.filter((s) => s.available).map((s) => s.time)).toEqual(['10:30', '11:00', '11:30']);
    expect(computeSlots({ day, hours: { ...hours, isOpen: false }, durationMinutes: 30, intervalMinutes: 30, busy: [], now })).toEqual([]);
  });
});

describe('checkSlotRules', () => {
  const base = { durationMinutes: 30, hours, intervalMinutes: 30, now, enforceGrid: true };
  it('acepta una franja válida', () => {
    expect(checkSlotRules({ ...base, startAt: parseLocalDateTime('2026-12-01T11:30') })).toBeNull();
  });
  it('rechaza horas fuera de horario, pasadas o fuera de la grilla', () => {
    expect(checkSlotRules({ ...base, startAt: parseLocalDateTime('2026-12-01T10:45') }).code).toBe('INVALID_SLOT');
    expect(checkSlotRules({ ...base, startAt: parseLocalDateTime('2026-12-01T10:45'), enforceGrid: false })).toBeNull();
    expect(checkSlotRules({ ...base, startAt: parseLocalDateTime('2026-12-01T11:45'), enforceGrid: false }).code).toBe('OUTSIDE_HOURS');
    expect(checkSlotRules({ ...base, startAt: parseLocalDateTime('2026-12-01T08:30') }).code).toBe('OUTSIDE_HOURS');
    expect(checkSlotRules({ ...base, startAt: parseLocalDateTime('2026-11-29T10:00') }).code).toBe('PAST_TIME');
    expect(checkSlotRules({ ...base, hours: { ...hours, isOpen: false }, startAt: parseLocalDateTime('2026-12-01T10:00') }).code).toBe('CLOSED_DAY');
    expect(checkSlotRules({ ...base, startAt: parseLocalDateTime('2027-06-01T10:00') }).code).toBe('TOO_FAR');
  });
});
