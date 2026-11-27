import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { Alert, Button, ConfirmDialog, EmptyState, Input, PageHeader, Select, Spinner, StatusBadge } from '../../components/ui';
import { addDaysISO, formatDateShort, formatMoney, formatTime, STATUS_LABELS, todayISO } from '../../utils/format';
import { ReservationForm } from './ReservationForm';

const STATUS_ACTIONS = {
  CONFIRMED: [
    ['COMPLETED', 'Completada'],
    ['NO_SHOW', 'No asistió'],
    ['CANCELLED', 'Cancelar'],
  ],
  COMPLETED: [['CONFIRMED', 'Reabrir']],
  NO_SHOW: [['CONFIRMED', 'Reabrir']],
  CANCELLED: [],
};

export default function Reservations() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ from: todayISO(), to: addDaysISO(todayISO(), 6), status: '', q: '' });
  const [page, setPage] = useState(1);
  const list = useAsync(() => api.get('/business/reservations', { ...filters, page, pageSize: 20 }), [filters, page]);
  const catalog = useAsync(() => Promise.all([api.get('/business/services'), api.get('/business/clients')]), []);
  const [formOpen, setFormOpen] = useState(params.get('nueva') === '1');
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (params.get('nueva') === '1') {
      setFormOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const setFilter = (k) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: e.target.value }));
  };

  const preset = (from, to) => {
    setPage(1);
    setFilters((f) => ({ ...f, from, to }));
  };

  async function applyStatus() {
    setBusy(true);
    try {
      await api.patch(`/business/reservations/${pending.reservation.id}/status`, { status: pending.status });
      toast.success(`Cita marcada como ${STATUS_LABELS[pending.status].toLowerCase()}`);
      setPending(null);
      list.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const [servicesRes, clientsRes] = catalog.data || [{ services: [] }, { clients: [] }];

  return (
    <div className="stack">
      <PageHeader
        title="Citas"
        subtitle="Crea, modifica, cancela y consulta las reservas de tu negocio."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            disabled={catalog.loading}
          >
            <CalendarPlus size={16} /> Nueva cita
          </Button>
        }
      />

      <div className="filters card">
        <div className="filter-presets">
          <button type="button" className="chip" onClick={() => preset(todayISO(), todayISO())}>
            Hoy
          </button>
          <button type="button" className="chip" onClick={() => preset(todayISO(), addDaysISO(todayISO(), 6))}>
            Próximos 7 días
          </button>
          <button type="button" className="chip" onClick={() => preset(addDaysISO(todayISO(), -30), todayISO())}>
            Últimos 30 días
          </button>
          <button type="button" className="chip" onClick={() => preset('', '')}>
            Todo el historial
          </button>
        </div>
        <div className="filter-fields">
          <Input label="Desde" type="date" value={filters.from} onChange={setFilter('from')} />
          <Input label="Hasta" type="date" value={filters.to} onChange={setFilter('to')} />
          <Select label="Estado" value={filters.status} onChange={setFilter('status')}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Input label="Buscar" placeholder="Cliente o servicio" value={filters.q} onChange={setFilter('q')} />
        </div>
      </div>

      {list.loading && <Spinner />}
      {list.error && <Alert type="error">{list.error.message}</Alert>}
      {list.data && list.data.reservations.length === 0 && (
        <EmptyState icon={CalendarDays} title="No hay citas con estos filtros">
          Ajusta el rango de fechas o crea una nueva cita.
        </EmptyState>
      )}
      {list.data && list.data.reservations.length > 0 && (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Precio</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {list.data.reservations.map((r) => (
                <tr key={r.id}>
                  <td data-label="Fecha">{formatDateShort(r.startAt)}</td>
                  <td data-label="Hora">
                    {formatTime(r.startAt)} – {formatTime(r.endAt)}
                  </td>
                  <td data-label="Cliente">
                    <Link to={`/panel/clientes/${r.client.id}`}>{r.client.name}</Link>
                    {r.notes && <div className="muted small">{r.notes}</div>}
                  </td>
                  <td data-label="Servicio">{r.service.name}</td>
                  <td data-label="Precio">{formatMoney(r.price)}</td>
                  <td data-label="Estado">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="row-actions">
                    {r.status === 'CONFIRMED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(r);
                          setFormOpen(true);
                        }}
                        aria-label={`Modificar cita de ${r.client.name}`}
                      >
                        <Pencil size={14} /> Modificar
                      </Button>
                    )}
                    {STATUS_ACTIONS[r.status].map(([status, label]) => (
                      <Button key={status} variant={status === 'CANCELLED' ? 'danger-ghost' : 'ghost'} size="sm" onClick={() => setPending({ reservation: r, status })}>
                        {label}
                      </Button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <span className="muted small">
              {list.data.total} cita(s) · página {list.data.page} de {list.data.totalPages}
            </span>
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">
              <ChevronLeft size={16} />
            </Button>
            <Button variant="ghost" size="sm" disabled={page >= list.data.totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Página siguiente">
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {formOpen && catalog.data && (
        <ReservationForm
          open
          reservation={editing}
          services={servicesRes.services}
          clients={clientsRes.clients}
          onClose={() => setFormOpen(false)}
          onSaved={(_r, wasEditing) => {
            toast.success(wasEditing ? 'Cita modificada' : 'Cita creada');
            setFormOpen(false);
            list.reload();
            catalog.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title="Cambiar estado de la cita"
        message={pending ? `¿Marcar la cita de ${pending.reservation.client.name} (${formatDateShort(pending.reservation.startAt)} ${formatTime(pending.reservation.startAt)}) como "${STATUS_LABELS[pending.status]}"?` : ''}
        confirmLabel="Confirmar"
        danger={pending?.status === 'CANCELLED'}
        loading={busy}
        onConfirm={applyStatus}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
