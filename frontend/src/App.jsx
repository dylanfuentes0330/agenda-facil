import { Route, Routes } from 'react-router-dom';
import { BusinessLayout, PublicLayout, RequireRole } from './components/Layouts';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Directory from './pages/client/Directory';
import BookingPage from './pages/client/BookingPage';
import MyReservations from './pages/client/MyReservations';
import Account from './pages/client/Account';
import Dashboard from './pages/business/Dashboard';
import Reservations from './pages/business/Reservations';
import Services from './pages/business/Services';
import Hours from './pages/business/Hours';
import Clients from './pages/business/Clients';
import ClientDetail from './pages/business/ClientDetail';
import SettingsPage from './pages/business/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="ingresar" element={<Login />} />
        <Route path="registro" element={<Register />} />
        <Route path="reservar" element={<Directory />} />
        <Route path="reservar/:slug" element={<BookingPage />} />
        <Route element={<RequireRole role="CLIENT" />}>
          <Route path="mis-reservas" element={<MyReservations />} />
          <Route path="cuenta" element={<Account />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<RequireRole role="BUSINESS_ADMIN" />}>
        <Route path="panel" element={<BusinessLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="citas" element={<Reservations />} />
          <Route path="servicios" element={<Services />} />
          <Route path="horarios" element={<Hours />} />
          <Route path="clientes" element={<Clients />} />
          <Route path="clientes/:id" element={<ClientDetail />} />
          <Route path="configuracion" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
