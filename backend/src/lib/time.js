// Utilidades de fecha/hora.
// Convención: las horas de reserva se manejan como "hora local del negocio" (wall-clock)
// y se representan con objetos Date cuyos campos UTC equivalen a la hora local.
// Así el cálculo de franjas no depende de la zona horaria del servidor (EC2 usa UTC).

const LOCAL_DT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const LOCAL_D = /^(\d{4})-(\d{2})-(\d{2})$/;
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function parseLocalDateTime(value) {
  const m = LOCAL_DT.exec(value || '');
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function parseLocalDate(value) {
  const m = LOCAL_D.exec(value || '');
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

const pad = (n) => String(n).padStart(2, '0');

export function formatLocalDateTime(date) {
  return `${formatLocalDate(date)}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function formatLocalDate(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function formatHHMM(date) {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function isValidHHMM(value) {
  return HHMM.test(value || '');
}

export function hhmmToMinutes(value) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * 86_400_000);
}

export function minutesOfDay(date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function startOfLocalDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** "Ahora" como hora local (wall-clock) en la zona horaria indicada. */
export function nowInZone(timeZone, reference = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(reference);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')));
}
