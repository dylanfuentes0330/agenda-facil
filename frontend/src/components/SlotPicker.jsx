import { useEffect, useState } from 'react';
import { CalendarOff } from 'lucide-react';
import { Alert, Input, Spinner } from './ui';
import { addDaysISO, formatDateLong, todayISO } from '../utils/format';

/**
 * Selector de fecha + franjas horarias disponibles.
 * fetchSlots(date) debe devolver la respuesta de /availability.
 */
export function SlotPicker({ fetchSlots, value, onChange, date, onDateChange, deps = [] }) {
  const [state, setState] = useState({ loading: false, error: null, data: null });

  useEffect(() => {
    if (!date) return undefined;
    let active = true;
    setState({ loading: true, error: null, data: null });
    fetchSlots(date)
      .then((data) => active && setState({ loading: false, error: null, data }))
      .catch((error) => active && setState({ loading: false, error, data: null }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, ...deps]);

  const available = state.data?.slots.filter((s) => s.available) ?? [];

  return (
    <div className="slot-picker">
      <div className="date-row">
        <Input
          label="Fecha"
          type="date"
          value={date}
          min={todayISO()}
          max={addDaysISO(todayISO(), 90)}
          onChange={(e) => {
            onDateChange(e.target.value);
            onChange(null);
          }}
          required
        />
        <div className="quick-dates">
          {[0, 1, 2].map((d) => {
            const iso = addDaysISO(todayISO(), d);
            return (
              <button
                type="button"
                key={iso}
                className={`chip ${iso === date ? 'active' : ''}`}
                onClick={() => {
                  onDateChange(iso);
                  onChange(null);
                }}
              >
                {d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : 'Pasado mañana'}
              </button>
            );
          })}
        </div>
      </div>
      {date && <p className="slot-date">{formatDateLong(date)}</p>}
      {state.loading && <Spinner label="Consultando horarios disponibles…" />}
      {state.error && <Alert type="error">{state.error.message}</Alert>}
      {state.data && !state.data.isOpen && (
        <div className="slots-empty">
          <CalendarOff size={20} /> {state.data.message || 'No hay atención este día.'}
        </div>
      )}
      {state.data && state.data.isOpen && (
        <>
          <p className="muted small">
            Horario de atención: {state.data.openTime} a {state.data.closeTime} · {available.length} franja(s) libre(s)
          </p>
          {state.data.slots.length === 0 || available.length === 0 ? (
            <div className="slots-empty">
              <CalendarOff size={20} /> No quedan horarios libres este día. Prueba otra fecha.
            </div>
          ) : (
            <div className="slots" role="listbox" aria-label="Horarios disponibles">
              {state.data.slots.map((s) => (
                <button
                  type="button"
                  key={s.startAt}
                  role="option"
                  aria-selected={value === s.startAt}
                  disabled={!s.available}
                  className={`slot ${value === s.startAt ? 'selected' : ''}`}
                  title={s.available ? `Reservar a las ${s.time}` : s.reason === 'PAST' ? 'Hora pasada' : 'Ocupado'}
                  onClick={() => onChange(s.startAt)}
                >
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
