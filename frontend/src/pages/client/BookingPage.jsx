import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Phone } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { Alert, Button, Card, Spinner, Textarea } from '../../components/ui';
import { SlotPicker } from '../../components/SlotPicker';
import { formatDateLong, formatMoney, formatTime, todayISO } from '../../utils/format';

export default function BookingPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(() => api.get(`/public/businesses/${slug}`), [slug]);
  const [serviceId, setServiceId] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [done, setDone] = useState(null);

  if (loading) return <Spinner />;
  if (error)
    return (
      <div className="container section-sm">
        <Alert type="error" title="No se pudo abrir el negocio">
          {error.message}
        </Alert>
        <Link to="/reservar">Volver al directorio</Link>
      </div>
    );

  const { business, services, hours } = data;
  const service = services.find((s) => s.id === serviceId);

  async function book() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await api.post('/client/reservations', { businessSlug: slug, serviceId, startAt: slot, notes: notes || null });
      setDone(res.reservation);
      toast.success('¡Reserva confirmada!');
    } catch (err) {
      setSubmitError(err.message);
      if (err.code === 'SLOT_TAKEN') {
        setSlot(null);
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="container narrow section-sm">
        <Card className="success-card">
          <CheckCircle2 size={48} className="success-icon" />
          <h1>Reserva confirmada</h1>
          <p>
            <strong>{done.service.name}</strong> en <strong>{business.name}</strong>
          </p>
          <p className="lead">
            {formatDateLong(done.startAt)} · {formatTime(done.startAt)} a {formatTime(done.endAt)}
          </p>
          <p className="muted">Puedes cancelar hasta {business.cancellationHours} hora(s) antes desde “Mis reservas”.</p>
          <div className="center-row">
            <Button onClick={() => navigate('/mis-reservas')}>Ver mis reservas</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDone(null);
                setSlot(null);
                setRefreshKey((k) => k + 1);
              }}
            >
              Reservar otra cita
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container section-sm">
      <div className="business-hero">
        {business.logoUrl ? <img src={business.logoUrl} alt={`Logo de ${business.name}`} className="business-logo-lg" /> : <span className="avatar avatar-xl">{business.name[0]}</span>}
        <div>
          <h1>{business.name}</h1>
          <p className="muted">{business.category}</p>
          {business.description && <p>{business.description}</p>}
          <p className="meta-row">
            {business.address && (
              <span>
                <MapPin size={14} /> {business.address}
                {business.city ? `, ${business.city}` : ''}
              </span>
            )}
            {business.phone && (
              <span>
                <Phone size={14} /> {business.phone}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="booking-layout">
        <div className="booking-main">
          <Card title="1. Elige un servicio">
            {services.length === 0 ? (
              <p className="muted">Este negocio aún no tiene servicios disponibles.</p>
            ) : (
              <div className="service-options" role="radiogroup" aria-label="Servicios">
                {services.map((s) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={serviceId === s.id}
                    key={s.id}
                    className={`service-option ${serviceId === s.id ? 'selected' : ''}`}
                    onClick={() => {
                      setServiceId(s.id);
                      setSlot(null);
                    }}
                  >
                    <span className="service-name">{s.name}</span>
                    {s.description && <span className="muted small">{s.description}</span>}
                    <span className="service-meta">
                      <Clock size={14} /> {s.durationMinutes} min · <strong>{formatMoney(s.price)}</strong>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {service && (
            <Card title="2. Elige fecha y hora">
              <SlotPicker
                date={date}
                onDateChange={setDate}
                value={slot}
                onChange={setSlot}
                deps={[serviceId, refreshKey]}
                fetchSlots={(d) => api.get(`/public/businesses/${slug}/availability`, { serviceId, date: d })}
              />
            </Card>
          )}
        </div>

        <aside className="booking-side">
          <Card title="Resumen">
            <dl className="summary">
              <dt>Servicio</dt>
              <dd>{service ? service.name : '—'}</dd>
              <dt>Fecha</dt>
              <dd>{slot ? formatDateLong(slot) : '—'}</dd>
              <dt>Hora</dt>
              <dd>{slot ? formatTime(slot) : '—'}</dd>
              <dt>Precio</dt>
              <dd>{service ? formatMoney(service.price) : '—'}</dd>
            </dl>
            {submitError && <Alert type="error">{submitError}</Alert>}
            {!user ? (
              <>
                <p className="muted small">Para confirmar la reserva necesitas una cuenta de cliente.</p>
                <Link to="/ingresar" state={{ from: `/reservar/${slug}` }} className="btn btn-primary btn-block">
                  Iniciar sesión para reservar
                </Link>
                <Link to="/registro?tipo=cliente" state={{ from: `/reservar/${slug}` }} className="btn btn-ghost btn-block">
                  Crear cuenta de cliente
                </Link>
              </>
            ) : user.role !== 'CLIENT' ? (
              <Alert type="info">Las reservas en línea se hacen con una cuenta de cliente. Desde tu panel puedes crear citas manualmente.</Alert>
            ) : (
              <>
                <Textarea label="Notas para el negocio" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} hint="Opcional" />
                <Button className="btn-block" disabled={!service || !slot} loading={submitting} onClick={book}>
                  Confirmar reserva
                </Button>
              </>
            )}
          </Card>
          <Card title="Horario de atención">
            <ul className="hours-list">
              {hours.map((h) => (
                <li key={h.dayOfWeek}>
                  <span>{h.dayName}</span>
                  <span>{h.isOpen ? `${h.openTime} – ${h.closeTime}` : 'Cerrado'}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
