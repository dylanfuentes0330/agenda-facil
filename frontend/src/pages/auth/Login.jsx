import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homeForRole, useAuth } from '../../context/AuthContext';
import { Alert, Button, Input } from '../../components/ui';
import { rules, validateForm } from '../../utils/validation';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const errs = validateForm(values, { email: [rules.required('El correo'), rules.email], password: [rules.required('La contraseña')] });
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const u = await login(values.email, values.password);
      const from = location.state?.from;
      const allowed = from && (u.role === 'BUSINESS_ADMIN' ? from.startsWith('/panel') : !from.startsWith('/panel'));
      navigate(allowed ? from : homeForRole(u.role), { replace: true });
    } catch (err) {
      setServerError(err.message);
      setErrors(err.fieldErrors || {});
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1>Iniciar sesión</h1>
        <p className="muted">Accede a tu panel de negocio o a tus reservas.</p>
        {location.state?.from && !serverError && <Alert type="info">Inicia sesión para continuar.</Alert>}
        {serverError && <Alert type="error">{serverError}</Alert>}
        <Input label="Correo electrónico" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} error={errors.email} required />
        <Input label="Contraseña" name="password" type="password" autoComplete="current-password" value={values.password} onChange={onChange} error={errors.password} required />
        <Button type="submit" className="btn-block" loading={loading}>
          Ingresar
        </Button>
        <p className="auth-switch">
          ¿No tienes cuenta? <Link to="/registro" state={location.state}>Regístrate</Link>
        </p>
      </form>
    </div>
  );
}
