import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, Spinner, StatusBadge } from '../../components/ui';
import { formatDateShort, formatMoney, formatTime } from '../../utils/format';
import { ClientForm } from './ClientForm';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get(`/business/clients/${id}/reservations`), [id]);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (error)
    return (
      <Alert type="error" title="No se pudo cargar el cliente">
        {error.message}
      </Alert>
    );
  const { client, reservations } = data;
  const completed = reservations.filter((r) => r.status === 'COMPLETED');

  async function remove() {
    setBusy(true);
    try {
      await api.del(`/business/clients/${client.id}`);
      toast.success('Cliente eliminado');
      navigate('/panel/clientes');
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <Link to="/panel/clientes" className="back-link">
        <ArrowLeft size={16} /> Clientes
      </Link>
      <PageHeader
        title={client.name}
        subtitle={client.hasAccount ? 'Cliente con cuenta de reservas en línea' : 'Cliente registrado por el negocio'}
        actions={
          <>
            <Button variant="ghost" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Editar
            </Button>
            {reservations.length === 0 && (
              <Button variant="danger-ghost" onClick={() => setDeleting(true)}>
                <Trash2 size={16} /> Eliminar
              </Button>
            )}
          </>
        }
      />
      <div className="dash-grid">
        <Card title="Datos de contacto">
          <ul className="contact-list">
            <li>
              <Phone size={16} /> {client.phone || 'Sin teléfono'}
            </li>
            <li>
              <Mail size={16} /> {client.email || 'Sin correo'}
            </li>
          </ul>
          {client.notes && (
            <>
              <h3 className="mini-title">Notas</h3>
              <p>{client.notes}</p>
            </>
          )}
        </Card>
        <Card title="Resumen">
          <p>
            Reservas totales: <strong>{reservations.length}</strong>
          </p>
          <p>
            Completadas: <strong>{completed.length}</strong> · Canceladas: <strong>{reservations.filter((r) => r.status === 'CANCELLED').length}</strong>
          </p>
          <p>
            Total en citas completadas: <strong>{formatMoney(completed.reduce((a, r) => a + r.price, 0))}</strong>
          </p>
        </Card>
      </div>
      <Card title="Historial de reservas">
        {reservations.length === 0 ? (
          <EmptyState title="Sin reservas registradas" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Servicio</th>
                  <th>Precio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Fecha">{formatDateShort(r.startAt)}</td>
                    <td data-label="Hora">{formatTime(r.startAt)}</td>
                    <td data-label="Servicio">{r.service.name}</td>
                    <td data-label="Precio">{formatMoney(r.price)}</td>
                    <td data-label="Estado">
                      <StatusBadge status={r.status} /> {r.cancelledBy && <Badge tone="neutral">por {r.cancelledBy === 'CLIENT' ? 'cliente' : 'negocio'}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && (
        <ClientForm
          client={client}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={deleting}
        title="Eliminar cliente"
        message={`¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={busy}
        onConfirm={remove}
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}
