import { useState } from 'react';
import { Clock, Pencil, Plus, Scissors, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Spinner, Textarea } from '../../components/ui';
import { formatMoney } from '../../utils/format';
import { rules, validateForm } from '../../utils/validation';

const emptyService = { name: '', description: '', durationMinutes: 30, price: '', isActive: true };

function ServiceForm({ service, onClose, onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState(service ? { ...service, description: service.description || '' } : emptyService);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save(e) {
    e?.preventDefault();
    const errs = validateForm(values, {
      name: [rules.required('El nombre'), rules.minLength(2, 'El nombre')],
      durationMinutes: [rules.number(5, 480, 'La duración'), (v) => (Number(v) % 5 === 0 ? null : 'Usa múltiplos de 5 minutos')],
      price: [rules.number(0, 99999999, 'El precio')],
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setError('');
    try {
      const body = { name: values.name, description: values.description || null, durationMinutes: Number(values.durationMinutes), price: Number(values.price), isActive: values.isActive };
      if (service) await api.put(`/business/services/${service.id}`, body);
      else await api.post('/business/services', body);
      toast.success(service ? 'Servicio actualizado' : 'Servicio creado');
      onSaved();
    } catch (err) {
      setError(err.code === 'DUPLICATE' ? 'Ya tienes un servicio con ese nombre' : err.message);
      setErrors(err.fieldErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={service ? 'Editar servicio' : 'Nuevo servicio'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form onSubmit={save} noValidate className="stack">
        {error && <Alert type="error">{error}</Alert>}
        <Input label="Nombre del servicio" value={values.name} onChange={set('name')} error={errors.name} required />
        <Textarea label="Descripción" value={values.description} onChange={set('description')} maxLength={500} hint="Opcional" />
        <div className="form-grid">
          <Input label="Duración (minutos)" type="number" min={5} max={480} step={5} value={values.durationMinutes} onChange={set('durationMinutes')} error={errors.durationMinutes} required />
          <Input label="Precio" type="number" min={0} step="0.01" value={values.price} onChange={set('price')} error={errors.price} required />
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={values.isActive} onChange={set('isActive')} /> Servicio activo (visible para reservas)
        </label>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Services() {
  const toast = useToast();
  const { business } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/business/services'), []);
  const [editing, setEditing] = useState(undefined);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  async function toggle(s) {
    try {
      await api.put(`/business/services/${s.id}`, { name: s.name, description: s.description, durationMinutes: s.durationMinutes, price: s.price, isActive: !s.isActive });
      toast.success(s.isActive ? 'Servicio desactivado' : 'Servicio activado');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await api.del(`/business/services/${toDelete.id}`);
      toast.success(res.message);
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const max = business?.plan?.maxServices;

  return (
    <div className="stack">
      <PageHeader
        title="Servicios"
        subtitle={max ? `Tu plan permite hasta ${max} servicios.` : 'Tu plan permite servicios ilimitados.'}
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus size={16} /> Nuevo servicio
          </Button>
        }
      />
      {loading && <Spinner />}
      {error && <Alert type="error">{error.message}</Alert>}
      {data && data.services.length === 0 && (
        <EmptyState icon={Scissors} title="Aún no tienes servicios" action={<Button onClick={() => setEditing(null)}>Crear el primer servicio</Button>}>
          Los clientes solo pueden reservar servicios activos.
        </EmptyState>
      )}
      <div className="service-grid">
        {data?.services.map((s) => (
          <article key={s.id} className={`service-card ${s.isActive ? '' : 'inactive'}`}>
            <header>
              <h3>{s.name}</h3>
              {s.isActive ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}
            </header>
            {s.description && <p className="muted small">{s.description}</p>}
            <p className="service-meta">
              <Clock size={14} /> {s.durationMinutes} min · <strong>{formatMoney(s.price)}</strong>
            </p>
            <p className="muted small">{s.reservationsCount} reserva(s) en el historial</p>
            <footer>
              <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                <Pencil size={14} /> Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toggle(s)}>
                {s.isActive ? 'Desactivar' : 'Activar'}
              </Button>
              <Button variant="danger-ghost" size="sm" onClick={() => setToDelete(s)}>
                <Trash2 size={14} /> Eliminar
              </Button>
            </footer>
          </article>
        ))}
      </div>
      {editing !== undefined && (
        <ServiceForm
          service={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar servicio"
        message={
          toDelete?.reservationsCount
            ? `"${toDelete.name}" tiene reservas en el historial, por lo que se desactivará en lugar de eliminarse.`
            : `¿Eliminar definitivamente "${toDelete?.name}"?`
        }
        confirmLabel={toDelete?.reservationsCount ? 'Desactivar' : 'Eliminar'}
        danger
        loading={busy}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
