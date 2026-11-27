import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import Login from '../pages/auth/Login';
import { RequireRole } from '../components/Layouts';
import { SlotPicker } from '../components/SlotPicker';

const wrap = (ui, { route = '/' } = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('Inicio de sesión', () => {
  it('muestra errores de validación sin llamar a la API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    wrap(<Login />);
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('El correo es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del servidor cuando las credenciales son incorrectas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Correo o contraseña incorrectos' } }), { status: 401 }),
    );
    wrap(<Login />);
    await userEvent.type(screen.getByLabelText(/Correo/), 'ana@correo.com');
    await userEvent.type(screen.getByLabelText(/Contraseña/), 'Mala12345');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
  });

  it('redirige al panel cuando inicia sesión un negocio', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ token: 't', user: { id: 1, name: 'Ana', role: 'BUSINESS_ADMIN' }, business: { name: 'X' } }), { status: 200 }),
    );
    wrap(
      <Routes>
        <Route path="/ingresar" element={<Login />} />
        <Route path="/panel" element={<p>Panel del negocio</p>} />
      </Routes>,
      { route: '/ingresar' },
    );
    await userEvent.type(screen.getByLabelText(/Correo/), 'ana@correo.com');
    await userEvent.type(screen.getByLabelText(/Contraseña/), 'Buena12345');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Panel del negocio')).toBeInTheDocument();
    expect(window.localStorage.getItem('agenda-facil.token')).toBe('t');
  });
});

describe('Rutas protegidas', () => {
  it('redirige a /ingresar si no hay sesión', async () => {
    wrap(
      <Routes>
        <Route element={<RequireRole role="BUSINESS_ADMIN" />}>
          <Route path="/panel" element={<p>Privado</p>} />
        </Route>
        <Route path="/ingresar" element={<p>Pantalla de ingreso</p>} />
      </Routes>,
      { route: '/panel' },
    );
    expect(await screen.findByText('Pantalla de ingreso')).toBeInTheDocument();
    expect(screen.queryByText('Privado')).not.toBeInTheDocument();
  });
});

describe('Selector de horarios', () => {
  it('muestra franjas, deshabilita las ocupadas y permite seleccionar una libre', async () => {
    const fetchSlots = vi.fn().mockResolvedValue({
      isOpen: true,
      openTime: '09:00',
      closeTime: '10:00',
      slots: [
        { time: '09:00', startAt: '2026-12-01T09:00', available: false, reason: 'BUSY' },
        { time: '09:30', startAt: '2026-12-01T09:30', available: true, reason: null },
      ],
    });
    const onChange = vi.fn();
    render(<SlotPicker fetchSlots={fetchSlots} date="2026-12-01" onDateChange={() => {}} value={null} onChange={onChange} />);
    const busy = await screen.findByRole('option', { name: '09:00' });
    expect(busy).toBeDisabled();
    await userEvent.click(screen.getByRole('option', { name: '09:30' }));
    expect(onChange).toHaveBeenCalledWith('2026-12-01T09:30');
    expect(fetchSlots).toHaveBeenCalledWith('2026-12-01');
  });

  it('informa cuando el negocio no atiende ese día', async () => {
    const fetchSlots = vi.fn().mockResolvedValue({ isOpen: false, slots: [], message: 'El negocio no atiende este día' });
    render(<SlotPicker fetchSlots={fetchSlots} date="2026-12-06" onDateChange={() => {}} value={null} onChange={() => {}} />);
    await waitFor(() => expect(screen.getByText('El negocio no atiende este día')).toBeInTheDocument());
  });
});
