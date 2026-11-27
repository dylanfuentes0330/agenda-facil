import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarCheck2, CalendarClock, CalendarDays, CircleDollarSign, Scissors, Users } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { Alert, Button, Card, EmptyState, PageHeader, Spinner, StatCard, StatusBadge } from '../../components/ui';
import { formatDateLong, formatDateTime, formatMoney, formatTime, STATUS_LABELS } from '../../utils/format';

function SetupChecklist({ data }) {
  const steps = [
    { done: data.totals.activeServices > 0, label: 'Registra al menos un servicio', to: '/panel/servicios' },
    { done: true, label: 'Revisa tus horarios de atención', to: '/panel/horarios' },
    { done: false, label: 'Comparte tu página de reservas con tus clientes', to: '/panel/configuracion' },
  ];
  if (data.totals.activeServices > 0) return null;
  return (
    <Alert type="warning" title="Completa la configuración de tu negocio">
      <ul className="checklist">
        {steps.map((s) => (
          <li key={s.label}>
            <Link to={s.to}>{s.label}</Link>
          </li>
        ))}
      </ul>
      Tu negocio aparecerá en el directorio de reservas cuando tenga al menos un servicio activo.
    </Alert>
  );
}

export default function Dashboard() {
  const { business } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/business/dashboard'), []);
  if (loading) return <Spinner />;
  if (error)
    return (
      <Alert type="error" title="No se pudo cargar el panel">
        {error.message} <Button variant="link" onClick={reload}>Reintentar</Button>
      </Alert>
    );

  const trialDays = Math.ceil((new Date(business.trialEndsAt) - new Date()) / 86_400_000);
  const s = data.last30Days.byStatus;

  return (
    <div className="stack">
      <PageHeader
        title="Resumen"
        subtitle={formatDateLong(data.date)}
        actions={
          <Link to="/panel/citas?nueva=1" className="btn btn-primary">
            <CalendarDays size={16} /> Nueva cita
          </Link>
        }
      />
      {trialDays >= 0 ? (
        <Alert type="info">
          Periodo de prueba del {business.plan?.name}: {trialDays} día(s) restante(s). Esta versión no procesa pagos.
        </Alert>
      ) : (
        <Alert type="warning">El periodo de prueba finalizó. La activación de suscripciones con pago está fuera del alcance de este MVP.</Alert>
      )}
      <SetupChecklist data={data} />

      <div className="stats-grid">
        <StatCard icon={CalendarCheck2} label="Citas hoy" value={data.today.total} />
        <StatCard icon={CalendarClock} label="Pendientes hoy" value={data.today.pending} tone="accent" />
        <StatCard icon={CalendarDays} label="Próximos 7 días" value={data.totals.next7Days} tone="info" />
        <StatCard icon={Users} label="Clientes" value={data.totals.clients} tone="neutral" />
      </div>

      <div className="dash-grid">
        <Card title="Citas de hoy" actions={<Link to="/panel/citas">Ver agenda</Link>}>
          {data.today.reservations.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Sin citas para hoy" />
          ) : (
            <ul className="timeline">
              {data.today.reservations.map((r) => (
                <li key={r.id} className={r.status === 'CANCELLED' ? 'is-cancelled' : ''}>
                  <span className="timeline-time">
                    {formatTime(r.startAt)}
                    <small>{formatTime(r.endAt)}</small>
                  </span>
                  <div>
                    <strong>{r.client.name}</strong>
                    <span className="muted small">{r.service.name}</span>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Próximas reservas">
          {data.upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No hay reservas próximas" />
          ) : (
            <ul className="simple-list">
              {data.upcoming.map((r) => (
                <li key={r.id}>
                  <div>
                    <strong>{r.client.name}</strong>
                    <span className="muted small">{r.service.name}</span>
                  </div>
                  <span className="small">{formatDateTime(r.startAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Últimos 30 días">
          <ul className="status-bars">
            {Object.entries(s).map(([k, v]) => {
              const total = Object.values(s).reduce((a, b) => a + b, 0) || 1;
              return (
                <li key={k}>
                  <span>{STATUS_LABELS[k]}</span>
                  <span className="bar">
                    <span className={`bar-fill fill-${k.toLowerCase()}`} style={{ width: `${(v / total) * 100}%` }} />
                  </span>
                  <strong>{v}</strong>
                </li>
              );
            })}
          </ul>
          <div className="kpi-row">
            <CircleDollarSign size={18} /> Ingresos de citas completadas: <strong>{formatMoney(data.last30Days.completedRevenue)}</strong>
          </div>
          <div className="kpi-row">
            <Scissors size={18} /> Servicios activos: <strong>{data.totals.activeServices}</strong>
          </div>
        </Card>

        <Card title="Estadísticas de rendimiento">
          {data.advanced ? (
            <>
              <p className="muted small">Tasa de cancelación: {data.advanced.cancellationRate}%</p>
              <h3 className="mini-title">Servicios más reservados</h3>
              {data.advanced.topServices.length === 0 ? (
                <p className="muted small">Aún no hay datos.</p>
              ) : (
                <ol className="simple-list">
                  {data.advanced.topServices.map((t) => (
                    <li key={t.name}>
                      <span>{t.name}</span>
                      <strong>{t.count}</strong>
                    </li>
                  ))}
                </ol>
              )}
              <h3 className="mini-title">Reservas por día de la semana</h3>
              <div className="weekday-chart">
                {data.advanced.byWeekday.map((d) => {
                  const max = Math.max(1, ...data.advanced.byWeekday.map((x) => x.count));
                  return (
                    <div key={d.day} className="weekday-col" title={`${d.day}: ${d.count}`}>
                      <span className="weekday-bar" style={{ height: `${(d.count / max) * 100}%` }} />
                      <small>{d.day.slice(0, 2)}</small>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState icon={AlertTriangle} title="Disponible en el Plan Profesional">
              Cambia de plan en <Link to="/panel/configuracion">Configuración</Link> para ver servicios más reservados, reservas por día y tasa de cancelación.
            </EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
