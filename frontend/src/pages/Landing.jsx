import { Link } from 'react-router-dom';
import { BarChart3, CalendarCheck2, CalendarX2, Clock, MessageSquareOff, ShieldCheck, Smartphone, Users, Scissors, Check } from 'lucide-react';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { Spinner } from '../components/ui';

const PROBLEMS = [
  { icon: CalendarX2, title: 'Citas duplicadas u olvidadas', text: 'La agenda en papel o en chats provoca dobles reservas y ausencias.' },
  { icon: MessageSquareOff, title: 'Saturación de mensajes', text: 'Responder WhatsApp y llamadas para cada cita consume horas del día.' },
  { icon: Users, title: 'Información dispersa', text: 'Los datos de clientes y su historial se pierden entre conversaciones.' },
];

const FEATURES = [
  { icon: Scissors, title: 'Servicios y precios', text: 'Registra cada servicio con su duración y precio.' },
  { icon: Clock, title: 'Horarios de atención', text: 'Define días y horas; la disponibilidad se calcula sola.' },
  { icon: CalendarCheck2, title: 'Reservas sin choques', text: 'El sistema impide reservas en horarios ocupados, incluso si llegan al mismo tiempo.' },
  { icon: Users, title: 'Base de clientes', text: 'Ficha de cada cliente con su historial completo de reservas.' },
  { icon: BarChart3, title: 'Panel del día', text: 'Citas de hoy, próximas reservas y estadísticas básicas.' },
  { icon: Smartphone, title: 'Portal para clientes', text: 'Tus clientes reservan y cancelan desde el celular, a cualquier hora.' },
];

function Plans() {
  const { data, loading, error } = useAsync(() => api.get('/public/plans'), []);
  if (loading) return <Spinner label="Cargando planes…" />;
  if (error) return <p className="muted center">No fue posible cargar los planes en este momento.</p>;
  return (
    <div className="plans">
      {data.plans.map((p) => (
        <article key={p.code} className={`plan ${p.code === 'PROFESIONAL' ? 'plan-featured' : ''}`}>
          {p.code === 'PROFESIONAL' && <span className="plan-tag">Más completo</span>}
          <h3>{p.name}</h3>
          <p className="muted">{p.description}</p>
          <ul>
            <li>
              <Check size={16} /> {p.maxServices ? `Hasta ${p.maxServices} servicios` : 'Servicios ilimitados'}
            </li>
            <li>
              <Check size={16} /> {p.maxClients ? `Hasta ${p.maxClients} clientes` : 'Clientes ilimitados'}
            </li>
            <li>
              <Check size={16} /> Agenda, reservas en línea y panel del día
            </li>
            <li className={p.advancedStats ? '' : 'off'}>
              <Check size={16} /> Estadísticas de rendimiento
            </li>
            <li>
              <Check size={16} /> {p.trialDays} días de prueba gratuita
            </li>
          </ul>
          <Link to={`/registro?plan=${p.code}`} className={`btn ${p.code === 'PROFESIONAL' ? 'btn-primary' : 'btn-outline'} btn-block`}>
            Empezar prueba gratuita
          </Link>
        </article>
      ))}
      <p className="plans-note">
        Versión académica (MVP): la plataforma no procesa pagos. El precio de cada plan está pendiente de definición y el
        periodo de prueba no genera cobros.
      </p>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Gestión de citas en la nube</span>
            <h1>Tu agenda organizada, sin dobles reservas ni mensajes interminables.</h1>
            <p>
              Agenda Fácil es una plataforma SaaS para barberías, peluquerías, salones de belleza, consultorios, estudios de
              tatuajes y centros de estética. Configura tus servicios y horarios, y deja que tus clientes reserven en línea.
            </p>
            <div className="hero-actions">
              <Link to="/registro" className="btn btn-primary btn-lg">
                Registrar mi negocio
              </Link>
              <Link to="/reservar" className="btn btn-outline btn-lg">
                Quiero reservar una cita
              </Link>
            </div>
            <p className="hero-note">
              <ShieldCheck size={16} /> Contraseñas cifradas, datos aislados por negocio y conexión HTTPS en producción.
            </p>
          </div>
          <div className="hero-card" aria-hidden>
            <div className="mock-header">
              <span>Hoy</span>
              <strong>Citas del día</strong>
            </div>
            {[
              ['09:00', 'Corte de cabello', 'Confirmada'],
              ['10:00', 'Arreglo de barba', 'Confirmada'],
              ['11:30', 'Tinte', 'Completada'],
              ['15:00', 'Manicure', 'Confirmada'],
            ].map(([t, s, st]) => (
              <div key={t} className="mock-row">
                <span className="mock-time">{t}</span>
                <span>{s}</span>
                <span className={`badge badge-${st === 'Completada' ? 'completed' : 'confirmed'}`}>{st}</span>
              </div>
            ))}
            <p className="mock-caption">Ilustración de la interfaz</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">El problema</h2>
          <p className="section-sub">La gestión manual por WhatsApp y llamadas genera errores que cuestan clientes.</p>
          <div className="grid-3">
            {PROBLEMS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="feature">
                <Icon className="feature-icon danger" size={26} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="funcionalidades">
        <div className="container">
          <h2 className="section-title">Todo lo que tu negocio necesita</h2>
          <p className="section-sub">Una única plataforma para el negocio y sus clientes.</p>
          <div className="grid-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="feature">
                <Icon className="feature-icon" size={26} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="como-funciona">
        <div className="container">
          <h2 className="section-title">¿Cómo funciona?</h2>
          <ol className="steps">
            <li>
              <strong>Crea tu cuenta</strong> y registra tu negocio.
            </li>
            <li>
              <strong>Configura</strong> servicios, precios y horarios de atención.
            </li>
            <li>
              <strong>Comparte</strong> tu página de reservas con tus clientes.
            </li>
            <li>
              <strong>Gestiona</strong> las citas del día desde tu panel.
            </li>
          </ol>
        </div>
      </section>

      <section className="section section-alt" id="planes">
        <div className="container">
          <h2 className="section-title">Planes</h2>
          <p className="section-sub">Empieza con el periodo de prueba gratuito y cambia de plan cuando lo necesites.</p>
          <Plans />
        </div>
      </section>

      <section className="section cta">
        <div className="container center">
          <h2>¿Listo para ordenar tu agenda?</h2>
          <div className="hero-actions center-row">
            <Link to="/registro" className="btn btn-primary btn-lg">
              Crear cuenta de negocio
            </Link>
            <Link to="/ingresar" className="btn btn-ghost btn-lg">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
