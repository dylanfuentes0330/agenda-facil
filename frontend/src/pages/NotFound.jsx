import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <div className="container narrow section">
      <EmptyState icon={Compass} title="Página no encontrada" action={<Link to="/" className="btn btn-primary">Volver al inicio</Link>}>
        La dirección que buscas no existe o fue movida.
      </EmptyState>
    </div>
  );
}
