import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, UserRound } from 'lucide-react';
import { homeForRole, useAuth } from '../../context/AuthContext';
import { Alert, Button, Input, Select } from '../../components/ui';
import { rules, validateForm } from '../../utils/validation';
import { CATEGORIES } from '../../utils/format';

const empty = {
  name: '',
  email: '',
  password: '',
  confirm: '',
  phone: '',
  businessName: '',
  category: CATEGORIES[0],
  city: '',
  address: '',
};

export default function Register() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { registerBusiness, registerClient, user } = useAuth();
  const [type, setType] = useState(params.get('tipo') === 'cliente' || location.state?.from ? 'client' : 'business');
  const [planCode, setPlanCode] = useState(params.get('plan') === 'PROFESIONAL' ? 'PROFESIONAL' : 'BASICO');
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const schema = {
      name: [rules.required('El nombre'), rules.minLength(2, 'El nombre')],
      email: [rules.required('El correo'), rules.email],
      password: [rules.password],
      confirm: [(v, all) => (v === all.password ? null : 'Las contraseñas no coinciden')],
      phone: [rules.phone],
      ...(type === 'business' ? { businessName: [rules.required('El nombre del negocio'), rules.minLength(2, 'El nombre del negocio')], category: [rules.required('La categoría')] } : {}),
    };
    const errs = validateForm(values, schema);
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const base = { name: values.name, email: values.email, password: values.password, phone: values.phone || null };
      const u =
        type === 'business'
          ? await registerBusiness({
              ...base,
              business: { name: values.businessName, category: values.category, city: values.city || null, address: values.address || null, planCode },
            })
          : await registerClient(base);
      const from = location.state?.from;
      navigate(type === 'client' && from ? from : homeForRole(u.role), { replace: true });
    } catch (err) {
      setServerError(err.message);
      const fe = err.fieldErrors || {};
      setErrors({ ...fe, businessName: fe['business.name'], category: fe['business.category'] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card auth-card-wide" onSubmit={onSubmit} noValidate>
        <h1>Crear cuenta</h1>
        <div className="segmented" role="tablist" aria-label="Tipo de cuenta">
          <button type="button" role="tab" aria-selected={type === 'business'} className={type === 'business' ? 'active' : ''} onClick={() => setType('business')}>
            <Briefcase size={16} /> Soy un negocio
          </button>
          <button type="button" role="tab" aria-selected={type === 'client'} className={type === 'client' ? 'active' : ''} onClick={() => setType('client')}>
            <UserRound size={16} /> Soy cliente
          </button>
        </div>
        <p className="muted">
          {type === 'business'
            ? 'Registra tu negocio para gestionar servicios, horarios, clientes y citas.'
            : 'Crea tu cuenta para reservar citas y consultar tus reservas.'}
        </p>
        {serverError && <Alert type="error">{serverError}</Alert>}

        <div className="form-grid">
          <Input label="Nombre completo" name="name" autoComplete="name" value={values.name} onChange={onChange} error={errors.name} required />
          <Input label="Teléfono" name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={onChange} error={errors.phone} hint="Opcional" />
          <Input label="Correo electrónico" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} error={errors.email} required />
          <span className="form-grid-spacer" />
          <Input label="Contraseña" name="password" type="password" autoComplete="new-password" value={values.password} onChange={onChange} error={errors.password} hint="Mínimo 8 caracteres, con letras y números" required />
          <Input label="Confirmar contraseña" name="confirm" type="password" autoComplete="new-password" value={values.confirm} onChange={onChange} error={errors.confirm} required />
        </div>

        {type === 'business' && (
          <fieldset className="fieldset">
            <legend>Datos del negocio</legend>
            <div className="form-grid">
              <Input label="Nombre del negocio" name="businessName" value={values.businessName} onChange={onChange} error={errors.businessName} required />
              <Select label="Categoría" name="category" value={values.category} onChange={onChange} error={errors.category} required>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Input label="Ciudad" name="city" value={values.city} onChange={onChange} hint="Opcional" />
              <Input label="Dirección" name="address" value={values.address} onChange={onChange} hint="Opcional" />
              <Select label="Plan" value={planCode} onChange={(e) => setPlanCode(e.target.value)} hint="Incluye periodo de prueba gratuito. Sin cobros en esta versión.">
                <option value="BASICO">Plan Básico</option>
                <option value="PROFESIONAL">Plan Profesional</option>
              </Select>
            </div>
          </fieldset>
        )}

        <Button type="submit" className="btn-block" loading={loading}>
          {type === 'business' ? 'Registrar negocio' : 'Crear cuenta'}
        </Button>
        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/ingresar" state={location.state}>Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
