import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { Alert, Badge, Button, EmptyState, PageHeader, Spinner } from '../../components/ui';
import { ClientForm } from './ClientForm';

export default function Clients() {
  const { business } = useAuth();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useAsync(() => api.get('/business/clients', { q: query }), [query]);
  const [creating, setCreating] = useState(false);
  const max = business?.plan?.maxClients;

  return (
    <div className="stack">
      <PageHeader
        title="Clientes"
        subtitle={max ? `Tu plan permite hasta ${max} clientes.` : 'Tu plan permite clientes ilimitados.'}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Nuevo cliente
          </Button>
        }
      />
      <form
        className="search-bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <Search size={18} aria-hidden />
        <input aria-label="Buscar cliente" placeholder="Buscar por nombre, correo o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" size="sm">
          Buscar
        </Button>
      </form>
      {loading && <Spinner />}
      {error && <Alert type="error">{error.message}</Alert>}
      {data && data.clients.length === 0 && (
        <EmptyState icon={Users} title={query ? 'Sin resultados' : 'Aún no tienes clientes'}>
          {query ? 'Prueba con otra búsqueda.' : 'Los clientes se registran automáticamente al reservar en línea, o puedes agregarlos manualmente.'}
        </EmptyState>
      )}
      {data && data.clients.length > 0 && (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Reservas</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {data.clients.map((c) => (
                <tr key={c.id}>
                  <td data-label="Nombre">
                    <strong>{c.name}</strong> {c.hasAccount && <Badge tone="info">Cuenta en línea</Badge>}
                  </td>
                  <td data-label="Teléfono">{c.phone || '—'}</td>
                  <td data-label="Correo">{c.email || '—'}</td>
                  <td data-label="Reservas">{c.reservationsCount}</td>
                  <td className="row-actions">
                    <Link to={`/panel/clientes/${c.id}`} className="btn btn-ghost btn-sm">
                      Ver ficha e historial
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && (
        <ClientForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
