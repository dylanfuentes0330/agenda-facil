import { useRef, useState } from 'react';
import { Copy, ExternalLink, ImagePlus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Alert, Badge, Button, Card, Input, PageHeader, Select, Textarea } from '../../components/ui';
import { PasswordForm, PersonalInfoForm } from '../../components/AccountForms';
import { CATEGORIES, TIMEZONES } from '../../utils/format';
import { rules, validateForm } from '../../utils/validation';

function BookingLink({ business }) {
  const toast = useToast();
  const url = `${window.location.origin}/reservar/${business.slug}`;
  return (
    <Card title="Tu página de reservas">
      <p className="muted">Comparte este enlace con tus clientes (por ejemplo, en tu perfil de redes sociales o en WhatsApp).</p>
      <div className="copy-row">
        <code>{url}</code>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success('Enlace copiado');
            } catch {
              toast.error('No se pudo copiar automáticamente; selecciona el enlace y cópialo.');
            }
          }}
        >
          <Copy size={14} /> Copiar
        </Button>
        <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> Abrir
        </a>
      </div>
    </Card>
  );
}

function ProfileForm({ business, onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState({
    name: business.name,
    category: business.category,
    description: business.description || '',
    phone: business.phone || '',
    address: business.address || '',
    city: business.city || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const categories = CATEGORIES.includes(values.category) ? CATEGORIES : [values.category, ...CATEGORIES];

  async function save(e) {
    e.preventDefault();
    const errs = validateForm(values, { name: [rules.required('El nombre'), rules.minLength(2, 'El nombre')], category: [rules.required('La categoría')], phone: [rules.phone] });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = await api.put('/business/profile', {
        ...values,
        description: values.description || null,
        phone: values.phone || null,
        address: values.address || null,
        city: values.city || null,
      });
      onSaved(res.business);
      toast.success('Datos del negocio actualizados');
    } catch (err) {
      setErrors(err.fieldErrors);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Datos del negocio">
      <form onSubmit={save} noValidate className="form-grid">
        <Input label="Nombre del negocio" value={values.name} onChange={set('name')} error={errors.name} required />
        <Select label="Categoría" value={values.category} onChange={set('category')} error={errors.category} required>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Input label="Teléfono" type="tel" value={values.phone} onChange={set('phone')} error={errors.phone} />
        <Input label="Ciudad" value={values.city} onChange={set('city')} />
        <Input label="Dirección" value={values.address} onChange={set('address')} />
        <span className="form-grid-spacer" />
        <div className="span-2">
          <Textarea label="Descripción" value={values.description} onChange={set('description')} maxLength={500} hint="Se muestra en tu página de reservas" />
        </div>
        <div className="form-actions">
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </Card>
  );
}

function LogoForm({ business, onSaved }) {
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file) {
    setError('');
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setError('Formato no permitido. Usa PNG, JPG o WEBP.');
    if (file.size > 2 * 1024 * 1024) return setError('La imagen supera 2 MB.');
    const form = new FormData();
    form.append('logo', file);
    setBusy(true);
    try {
      const res = await api.post('/business/logo', form);
      onSaved(res.business);
      toast.success('Logo actualizado');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await api.del('/business/logo');
      onSaved(res.business);
      toast.success('Logo eliminado');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Logo">
      <div className="logo-row">
        {business.logoUrl ? <img src={business.logoUrl} alt="Logo actual" className="business-logo-lg" /> : <span className="avatar avatar-xl">{business.name[0]}</span>}
        <div className="stack-sm">
          {error && <Alert type="error">{error}</Alert>}
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload(e.target.files[0])} />
          <Button variant="outline" loading={busy} onClick={() => input.current.click()}>
            <ImagePlus size={16} /> {business.logoUrl ? 'Cambiar logo' : 'Subir logo'}
          </Button>
          {business.logoUrl && (
            <Button variant="danger-ghost" size="sm" onClick={remove} disabled={busy}>
              <Trash2 size={14} /> Quitar logo
            </Button>
          )}
          <p className="muted small">PNG, JPG o WEBP de hasta 2 MB. En producción se almacena en un bucket Amazon S3 privado.</p>
        </div>
      </div>
    </Card>
  );
}

function PreferencesForm({ business, onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState({ timezone: business.timezone, slotIntervalMinutes: business.slotIntervalMinutes, cancellationHours: business.cancellationHours });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const zones = TIMEZONES.includes(values.timezone) ? TIMEZONES : [values.timezone, ...TIMEZONES];

  async function save(e) {
    e.preventDefault();
    const errs = validateForm(values, { cancellationHours: [rules.number(0, 168, 'El margen de cancelación')] });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = await api.put('/business/settings', { ...values, slotIntervalMinutes: Number(values.slotIntervalMinutes), cancellationHours: Number(values.cancellationHours) });
      onSaved(res.business);
      toast.success('Preferencias guardadas');
    } catch (err) {
      setErrors(err.fieldErrors);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Preferencias de agenda">
      <form onSubmit={save} noValidate className="form-grid">
        <Select label="Zona horaria" value={values.timezone} onChange={set('timezone')} error={errors.timezone}>
          {zones.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </Select>
        <Select label="Intervalo entre franjas" value={values.slotIntervalMinutes} onChange={set('slotIntervalMinutes')} error={errors.slotIntervalMinutes}>
          {[10, 15, 20, 30, 45, 60].map((m) => (
            <option key={m} value={m}>
              Cada {m} minutos
            </option>
          ))}
        </Select>
        <Input
          label="Margen de cancelación (horas)"
          type="number"
          min={0}
          max={168}
          value={values.cancellationHours}
          onChange={set('cancellationHours')}
          error={errors.cancellationHours}
          hint="Los clientes pueden cancelar en línea hasta estas horas antes de la cita"
        />
        <div className="form-actions">
          <Button type="submit" loading={saving}>
            Guardar preferencias
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PlanCard({ business, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const target = business.plan.code === 'BASICO' ? 'PROFESIONAL' : 'BASICO';
  const trialDays = Math.ceil((new Date(business.trialEndsAt) - new Date()) / 86_400_000);

  async function change() {
    setBusy(true);
    try {
      const res = await api.put('/business/plan', { planCode: target });
      onSaved(res.business);
      toast.success(`Ahora usas el ${res.business.plan.name}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Plan">
      <p>
        Plan actual: <strong>{business.plan.name}</strong> <Badge tone="info">{trialDays >= 0 ? `Prueba: ${trialDays} día(s)` : 'Prueba finalizada'}</Badge>
      </p>
      <p className="muted small">{business.plan.description}</p>
      <Alert type="info">Esta versión académica no incluye pasarela de pago: el cambio de plan solo ajusta los límites y funciones, sin ningún cobro.</Alert>
      <Button variant="outline" loading={busy} onClick={change}>
        Cambiar a {target === 'PROFESIONAL' ? 'Plan Profesional' : 'Plan Básico'}
      </Button>
    </Card>
  );
}

export default function SettingsPage() {
  const { business, setBusiness } = useAuth();
  return (
    <div className="stack">
      <PageHeader title="Configuración" subtitle="Perfil del negocio, preferencias, plan e información personal." />
      <BookingLink business={business} />
      <div className="dash-grid">
        <ProfileForm business={business} onSaved={setBusiness} />
        <div className="stack">
          <LogoForm business={business} onSaved={setBusiness} />
          <PlanCard business={business} onSaved={setBusiness} />
        </div>
      </div>
      <PreferencesForm business={business} onSaved={setBusiness} />
      <div className="dash-grid">
        <PersonalInfoForm />
        <PasswordForm />
      </div>
    </div>
  );
}
