import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Input } from './ui';
import { rules, validateForm } from '../utils/validation';

export function PersonalInfoForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ name: user.name, phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const errs = validateForm(values, { name: [rules.required('El nombre'), rules.minLength(2, 'El nombre')], phone: [rules.phone] });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = await api.put('/auth/me', { name: values.name, phone: values.phone || null });
      setUser(res.user);
      toast.success('Datos personales actualizados');
    } catch (err) {
      setErrors(err.fieldErrors);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Información personal">
      <form onSubmit={onSubmit} noValidate className="form-grid">
        <Input label="Nombre completo" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} error={errors.name} required />
        <Input label="Teléfono" type="tel" value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} error={errors.phone} />
        <Input label="Correo electrónico" value={user.email} disabled hint="El correo no se puede cambiar" />
        <div className="form-actions">
          <Button type="submit" loading={saving}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const toast = useToast();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    const errs = validateForm(values, {
      currentPassword: [rules.required('La contraseña actual')],
      newPassword: [rules.password],
      confirm: [(v, all) => (v === all.newPassword ? null : 'Las contraseñas no coinciden')],
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success('Contraseña actualizada');
      setValues({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setErrors(err.code === 'UNAUTHORIZED' ? { currentPassword: err.message } : err.fieldErrors);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Cambiar contraseña">
      <form onSubmit={onSubmit} noValidate className="form-grid">
        <Input label="Contraseña actual" type="password" autoComplete="current-password" value={values.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} required />
        <span className="form-grid-spacer" />
        <Input label="Nueva contraseña" type="password" autoComplete="new-password" value={values.newPassword} onChange={set('newPassword')} error={errors.newPassword} required />
        <Input label="Confirmar nueva contraseña" type="password" autoComplete="new-password" value={values.confirm} onChange={set('confirm')} error={errors.confirm} required />
        <div className="form-actions">
          <Button type="submit" loading={saving}>
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </Card>
  );
}
