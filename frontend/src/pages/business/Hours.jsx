import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { Alert, Button, Card, PageHeader, Spinner } from '../../components/ui';

// Orden de visualización: lunes a domingo
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Hours() {
  const toast = useToast();
  const { data, loading, error } = useAsync(() => api.get('/business/hours'), []);
  const [hours, setHours] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setHours(data.hours);
  }, [data]);

  const update = (day, patch) => setHours((hs) => hs.map((h) => (h.dayOfWeek === day ? { ...h, ...patch } : h)));

  function copyMondayToWeekdays() {
    const monday = hours.find((h) => h.dayOfWeek === 1);
    setHours((hs) => hs.map((h) => (h.dayOfWeek >= 2 && h.dayOfWeek <= 5 ? { ...h, isOpen: monday.isOpen, openTime: monday.openTime, closeTime: monday.closeTime } : h)));
  }

  async function save() {
    const errs = {};
    hours.forEach((h) => {
      if (h.isOpen && h.openTime >= h.closeTime) errs[h.dayOfWeek] = 'La hora de cierre debe ser posterior a la de apertura';
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = await api.put('/business/hours', {
        hours: hours.map(({ dayOfWeek, isOpen, openTime, closeTime }) => ({ dayOfWeek, isOpen, openTime, closeTime })),
      });
      setHours(res.hours);
      toast.success('Horario guardado');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader title="Horarios de atención" subtitle="Define los días y horas en que tu negocio recibe citas." />
      {loading && <Spinner />}
      {error && <Alert type="error">{error.message}</Alert>}
      {hours && (
        <Card
          actions={
            <Button variant="ghost" size="sm" onClick={copyMondayToWeekdays}>
              <Copy size={14} /> Copiar lunes a martes–viernes
            </Button>
          }
          title="Semana"
        >
          <div className="hours-table">
            {ORDER.map((d) => {
              const h = hours.find((x) => x.dayOfWeek === d);
              return (
                <div key={d} className={`hours-row ${h.isOpen ? '' : 'closed'}`}>
                  <label className="switch">
                    <input type="checkbox" checked={h.isOpen} onChange={(e) => update(d, { isOpen: e.target.checked })} aria-label={`${h.dayName} abierto`} />
                    <span className="switch-track" />
                    <span className="day-name">{h.dayName}</span>
                  </label>
                  {h.isOpen ? (
                    <div className="hours-inputs">
                      <label>
                        <span className="sr-only">Apertura {h.dayName}</span>
                        <input type="time" value={h.openTime} onChange={(e) => update(d, { openTime: e.target.value })} required />
                      </label>
                      <span>a</span>
                      <label>
                        <span className="sr-only">Cierre {h.dayName}</span>
                        <input type="time" value={h.closeTime} onChange={(e) => update(d, { closeTime: e.target.value })} required />
                      </label>
                    </div>
                  ) : (
                    <span className="muted">Cerrado</span>
                  )}
                  {errors[d] && <p className="field-error hours-error">{errors[d]}</p>}
                </div>
              );
            })}
          </div>
          <p className="muted small">
            Las franjas de reserva se generan según el intervalo y la zona horaria configurados en <Link to="/panel/configuracion">Configuración</Link>. Cambiar el horario no
            cancela citas ya reservadas.
          </p>
          <div className="form-actions">
            <Button onClick={save} loading={saving}>
              Guardar horario
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
