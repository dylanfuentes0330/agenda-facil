import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { Alert, Button, ConfirmDialog, EmptyState, PageHeader, Spinner, StatusBadge } from '../../components/ui';
import { formatDateLong, formatMoney, formatMonthShort, formatTime } from '../../utils/format';

export default function MyReservations() {
  const toast = useToast();
  const [scope, setScope] = useState('upcoming');
  const { data, loading, error, reload } = useAsync(() => api.get('/client/reservations', { scope }), [scope]);
  const [toCancel, setToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  async function cancel() {
    setCancelling(true);
    try {
      await api.patch(`/client/reservations/${toCancel.id}/cancel`);
      toast.success('Reserva cancelada');
      setToCancel(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="container section-sm">
      <PageHeader
        title="Mis reservas"
        subtitle="Consulta y gestiona tus citas."
        actions={
          <Link to="/reservar" className="btn btn-primary">
            Nueva reserva
          </Link>
        }
      />
      <div className="segmented inline" role="tablist">
        {[
          ['upcoming', 'Próximas'],
          ['past', 'Historial'],
        ].map(([k, label]) => (
          <button type="button" key={k} role="tab" aria-selected={scope === k} className={scope === k ? 'active' : ''} onClick={() => setScope(k)}>
            {label}
          </button>
        ))}
      </div>
      {loading && <Spinner />}
      {error && <Alert type="error">{error.message}</Alert>}
      {data && data.reservations.length === 0 && (
        <EmptyState icon={CalendarDays} title={scope === 'upcoming' ? 'No tienes citas próximas' : 'Aún no tienes historial'} action={<Link to="/reservar" className="btn btn-primary">Reservar una cita</Link>} />
      )}
      <div className="reservation-list">
        {data?.reservations.map((r) => (
          <article key={r.id} className="reservation-card">
            <div className="reservation-date">
              <span className="day">{r.startAt.slice(8, 10)}</span>
              <span className="month">{formatMonthShort(r.startAt)}</span>
            </div>
            <div className="reservation-info">
              <h3>{r.service.name}</h3>
              <p>
                <strong>{r.business.name}</strong> · {formatDateLong(r.startAt)} · {formatTime(r.startAt)} – {formatTime(r.endAt)}
              </p>
              {r.business.address && (
                <p className="muted small">
                  <MapPin size={13} /> {r.business.address}
                </p>
              )}
              <p className="muted small">{formatMoney(r.price)}</p>
            </div>
            <div className="reservation-actions">
              <StatusBadge status={r.status} />
              {r.canCancel && (
                <Button variant="danger-ghost" size="sm" onClick={() => setToCancel(r)}>
                  Cancelar
                </Button>
              )}
              {r.status === 'CONFIRMED' && !r.canCancel && <span className="muted small">Fuera del plazo de cancelación ({r.business.cancellationHours} h)</span>}
            </div>
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(toCancel)}
        title="Cancelar reserva"
        message={toCancel ? `¿Seguro que deseas cancelar "${toCancel.service.name}" del ${formatDateLong(toCancel.startAt)} a las ${formatTime(toCancel.startAt)}?` : ''}
        confirmLabel="Sí, cancelar"
        danger
        loading={cancelling}
        onConfirm={cancel}
        onClose={() => setToCancel(null)}
      />
    </div>
  );
}
