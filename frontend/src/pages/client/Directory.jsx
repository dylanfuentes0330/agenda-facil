import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, Store } from 'lucide-react';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { Alert, Button, EmptyState, PageHeader, Spinner } from '../../components/ui';

export default function Directory() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useAsync(() => api.get('/public/businesses', { q: query }), [query]);

  return (
    <div className="container section-sm">
      <PageHeader title="Reservar una cita" subtitle="Elige el negocio donde quieres agendar tu cita." />
      <form
        className="search-bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <Search size={18} aria-hidden />
        <input aria-label="Buscar negocio" placeholder="Buscar por nombre, categoría o ciudad" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" size="sm">
          Buscar
        </Button>
      </form>
      {loading && <Spinner />}
      {error && (
        <Alert type="error" title="No se pudieron cargar los negocios">
          {error.message} <Button variant="link" onClick={reload}>Reintentar</Button>
        </Alert>
      )}
      {data && data.businesses.length === 0 && (
        <EmptyState icon={Store} title={query ? 'Sin resultados' : 'Aún no hay negocios disponibles'}>
          {query ? 'Prueba con otra búsqueda.' : 'Los negocios aparecen aquí cuando registran al menos un servicio activo.'}
        </EmptyState>
      )}
      <div className="business-grid">
        {data?.businesses.map((b) => (
          <Link key={b.id} to={`/reservar/${b.slug}`} className="business-card">
            {b.logoUrl ? <img src={b.logoUrl} alt="" className="business-logo" /> : <span className="avatar avatar-lg">{b.name[0]}</span>}
            <div>
              <h3>{b.name}</h3>
              <p className="muted">{b.category}</p>
              {b.city && (
                <p className="muted small">
                  <MapPin size={14} /> {b.city}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
