import { useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Alert, Button, Input, Modal, Select, Textarea } from '../../components/ui';
import { SlotPicker } from '../../components/SlotPicker';
import { formatDateLong, formatTime, todayISO } from '../../utils/format';
import { rules, validateForm } from '../../utils/validation';

/** Crear (reservation = null) o reprogramar/editar una cita desde el panel del negocio. */
export function ReservationForm({ open, reservation, services, clients, onClose, onSaved }) {
  const editing = Boolean(reservation);
  const activeServices = useMemo(() => services.filter((s) => s.isActive), [services]);
  const [serviceId, setServiceId] = useState(reservation?.service.id ?? activeServices[0]?.id ?? '');
  const [date, setDate] = useState(reservation ? reservation.startAt.slice(0, 10) : todayISO());
  const [slot, setSlot] = useState(reservation?.startAt ?? null);
  const [clientMode, setClientMode] = useState('existing');
  const [clientId, setClientId] = useState('');
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' });
  const [notes, setNotes] = useState(reservation?.notes ?? '');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function save() {
    setError('');
    const errs = {};
    if (!serviceId) errs.serviceId = 'Selecciona un servicio';
    if (!slot) errs.slot = 'Selecciona una hora disponible';
    if (!editing) {
      if (clientMode === 'existing' && !clientId) errs.clientId = 'Selecciona un cliente';
      if (clientMode === 'new') {
        Object.assign(errs, validateForm(newClient, { name: [rules.required('El nombre'), rules.minLength(2, 'El nombre')], phone: [rules.phone], email: [rules.email] }));
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const body = { serviceId: Number(serviceId), startAt: slot, notes: notes || null };
      const res = editing
        ? await api.put(`/business/reservations/${reservation.id}`, body)
        : await api.post('/business/reservations', {
            ...body,
            ...(clientMode === 'existing'
              ? { clientId: Number(clientId) }
              : { newClient: { name: newClient.name, phone: newClient.phone || null, email: newClient.email || null } }),
          });
      onSaved(res.reservation, editing);
    } catch (err) {
      setError(err.message);
      if (err.code === 'SLOT_TAKEN') {
        setSlot(null);
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Modificar cita' : 'Nueva cita'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving}>
            {editing ? 'Guardar cambios' : 'Crear cita'}
          </Button>
        </>
      }
    >
      {activeServices.length === 0 ? (
        <Alert type="warning">Primero registra al menos un servicio activo.</Alert>
      ) : (
        <div className="stack">
          {error && <Alert type="error">{error}</Alert>}
          {!editing && (
            <fieldset className="fieldset">
              <legend>Cliente</legend>
              <div className="segmented inline">
                <button type="button" className={clientMode === 'existing' ? 'active' : ''} onClick={() => setClientMode('existing')}>
                  Cliente registrado
                </button>
                <button type="button" className={clientMode === 'new' ? 'active' : ''} onClick={() => setClientMode('new')}>
                  Cliente nuevo
                </button>
              </div>
              {clientMode === 'existing' ? (
                <Select label="Cliente" value={clientId} onChange={(e) => setClientId(e.target.value)} error={errors.clientId} required>
                  <option value="">Selecciona…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ''}
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="form-grid">
                  <Input label="Nombre" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} error={errors.name} required />
                  <Input label="Teléfono" type="tel" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} error={errors.phone} />
                  <Input label="Correo" type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} error={errors.email} />
                </div>
              )}
            </fieldset>
          )}
          {editing && (
            <p className="muted">
              Cliente: <strong>{reservation.client.name}</strong> · Actual: {formatDateLong(reservation.startAt)} a las {formatTime(reservation.startAt)}
            </p>
          )}
          <Select
            label="Servicio"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setSlot(null);
            }}
            error={errors.serviceId}
            required
          >
            {activeServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} min)
              </option>
            ))}
          </Select>
          <SlotPicker
            date={date}
            onDateChange={setDate}
            value={slot}
            onChange={setSlot}
            deps={[serviceId, refreshKey]}
            fetchSlots={(d) => api.get('/business/reservations/availability', { serviceId, date: d, excludeReservationId: reservation?.id })}
          />
          {errors.slot && <p className="field-error">{errors.slot}</p>}
          <Textarea label="Notas" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}
