import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck2, CalendarDays, Clock, LayoutDashboard, LogOut, Menu, Scissors, Settings, Users, X, CalendarPlus, UserRound } from 'lucide-react';
import { homeForRole, useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="Agenda Fácil, inicio">
      <img src="/favicon.svg" alt="" width="30" height="30" />
      <span>
        Agenda <strong>Fácil</strong>
      </span>
    </Link>
  );
}

export function RequireRole({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Verificando sesión…" />;
  if (!user) return <Navigate to="/ingresar" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to={homeForRole(user.role)} replace />;
  return <Outlet />;
}

export function PublicLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const close = () => setOpen(false);
  return (
    <div className="public-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Logo />
          <button type="button" className="icon-btn menu-toggle" onClick={() => setOpen((o) => !o)} aria-label="Abrir menú" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
          <nav className={`topnav ${open ? 'open' : ''}`} onClick={close}>
            <NavLink to="/reservar">Reservar cita</NavLink>
            {!user && <a href="/#planes">Planes</a>}
            {user?.role === 'CLIENT' && <NavLink to="/mis-reservas">Mis reservas</NavLink>}
            {user?.role === 'CLIENT' && <NavLink to="/cuenta">Mi cuenta</NavLink>}
            {user?.role === 'BUSINESS_ADMIN' && <NavLink to="/panel">Mi panel</NavLink>}
            {user ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <LogOut size={16} /> Salir
              </button>
            ) : (
              <>
                <NavLink to="/ingresar">Iniciar sesión</NavLink>
                <Link to="/registro" className="btn btn-primary btn-sm">
                  Crear cuenta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <Logo />
          <p>Proyecto académico SaaS · Gestión de citas y reservas para pequeños negocios.</p>
        </div>
      </footer>
    </div>
  );
}

const BUSINESS_NAV = [
  { to: '/panel', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/panel/citas', label: 'Citas', icon: CalendarDays },
  { to: '/panel/servicios', label: 'Servicios', icon: Scissors },
  { to: '/panel/horarios', label: 'Horarios', icon: Clock },
  { to: '/panel/clientes', label: 'Clientes', icon: Users },
  { to: '/panel/configuracion', label: 'Configuración', icon: Settings },
];

export function BusinessLayout() {
  const { user, business, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className={`app-shell ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar" aria-label="Navegación del panel">
        <div className="sidebar-top">
          <Logo to="/panel" />
          <button type="button" className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Cerrar menú">
            <X />
          </button>
        </div>
        <div className="sidebar-business">
          {business?.logoUrl ? <img src={business.logoUrl} alt="" /> : <span className="avatar">{business?.name?.[0] ?? 'N'}</span>}
          <div>
            <strong>{business?.name}</strong>
            <small>{business?.plan?.name}</small>
          </div>
        </div>
        <nav className="sidenav" onClick={() => setOpen(false)}>
          {BUSINESS_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={18} aria-hidden /> {label}
            </NavLink>
          ))}
          <a href={`/reservar/${business?.slug}`} target="_blank" rel="noreferrer">
            <CalendarPlus size={18} aria-hidden /> Mi página de reservas
          </a>
        </nav>
        <div className="sidebar-footer">
          <span className="muted">
            <UserRound size={14} /> {user?.name}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <div className="app-main">
        <header className="app-topbar">
          <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label="Abrir menú">
            <Menu />
          </button>
          <span className="app-topbar-title">
            <CalendarCheck2 size={18} /> {business?.name}
          </span>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
