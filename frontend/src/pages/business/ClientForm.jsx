import { useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Alert, Button, Input, Modal, Textarea } from '../../components/ui';
import { rules, validateForm } from '../../utils/validation';

export function ClientForm({ client, onClose, onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState({ name: client?.name || '', email: client?.email || '', phone: client?.phone || '', notes: client?.notes || '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function save(e) {
    e?.preventDefault();
    const errs = validateForm(values, { name: [rules.required('El nombre'), rules.minLength(2, 'El nombre')], email: [rules.email], phone: [rules.phone] });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setError('');
    try {
      const body = { name: values.name, email: values.email || null, phone: values.phone || null, notes: values.notes || null };
      const res = client ? await api.put(`/business/clients/${client.id}`, body) : await api.post('/business/clients', body);
      toast.success(client ? 'Cliente actualizado' : 'Cliente registrado');
      onSaved(res.client);
    } catch (err) {
      setError(err.message);
      setErrors(err.fieldErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={client ? 'Editar cliente' : 'Nuevo cliente'}
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
        <Input label="Nombre completo" value={values.name} onChange={set('name')} error={errors.name} required />
        <div className="form-grid">
          <Input label="Teléfono" type="tel" value={values.phone} onChange={set('phone')} error={errors.phone} />
          <Input label="Correo electrónico" type="email" value={values.email} onChange={set('email')} error={errors.email} />
        </div>
        <Textarea label="Notas internas" value={values.notes} onChange={set('notes')} maxLength={500} hint="Solo visibles para tu negocio" />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
