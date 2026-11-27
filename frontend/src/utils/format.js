// Las fechas de reservas llegan como "AAAA-MM-DDTHH:MM" en hora local del negocio.
// Se interpretan como UTC y se formatean con timeZone UTC para no desplazarlas.
const toDate = (local) => new Date(`${local.length === 10 ? `${local}T00:00` : local}:00Z`);

const fmt = (opts) => new Intl.DateTimeFormat('es', { timeZone: 'UTC', ...opts });

export const formatDateLong = (local) => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(local));
export const formatDateShort = (local) => fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(toDate(local));
export const formatTime = (local) => local.slice(11, 16);
export const formatDateTime = (local) => `${formatDateShort(local)} · ${formatTime(local)}`;

export const formatMoney = (value) =>
  `$${new Intl.NumberFormat('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value || 0))}`;

const pad = (n) => String(n).padStart(2, '0');
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const addDaysISO = (iso, days) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const STATUS_LABELS = {
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

export const CATEGORIES = [
  'Barbería',
  'Peluquería',
  'Salón de belleza',
  'Consultorio',
  'Estudio de tatuajes',
  'Centro de estética',
  'Manicure y pedicure',
  'Entrenamiento personal',
  'Otro',
];

export const TIMEZONES = [
  'America/Bogota',
  'America/Lima',
  'America/Guayaquil',
  'America/Mexico_City',
  'America/Caracas',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Panama',
  'America/New_York',
  'Europe/Madrid',
];

export const formatMonthShort = (local) => fmt({ month: 'short' }).format(toDate(local)).replace('.', '');
