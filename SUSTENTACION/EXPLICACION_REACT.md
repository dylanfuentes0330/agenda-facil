# Frontend React — explicación para la sustentación

## Configuración
- **Vite 6** (`frontend/vite.config.js`): servidor de desarrollo en el puerto 5173 con **proxy** de `/api` y `/uploads`
  hacia el backend (puerto 3000). `npm run build` genera archivos estáticos en `frontend/dist` (HTML, JS y CSS con hash),
  que en producción se suben a S3.
- **Variables**: `VITE_API_URL` vacía → la app llama a `/api` en el mismo dominio (CloudFront enruta `/api/*` a EC2).
- **ESLint** con reglas de hooks de React; **Vitest + Testing Library** para pruebas de componentes.

## Estructura (`frontend/src`)
| Carpeta / archivo | Responsabilidad |
|---|---|
| `main.jsx` | Punto de entrada: `BrowserRouter` → `ToastProvider` → `AuthProvider` → `App` |
| `App.jsx` | Definición de rutas (React Router 7) |
| `api/client.js` | Cliente HTTP con `fetch`: agrega el token, normaliza errores en `ApiError` (código, mensaje, errores por campo) y cierra sesión ante un 401 |
| `context/AuthContext.jsx` | Estado global de sesión: usuario, negocio, `login`, `registerBusiness`, `registerClient`, `logout`, `refresh` |
| `context/ToastContext.jsx` | Notificaciones de éxito/error |
| `hooks/useAsync.js` | Hook para cargar datos con estados `loading`, `error`, `data` y `reload` |
| `components/ui.jsx` | Componentes reutilizables: `Button`, `Input`, `Select`, `Textarea`, `Alert`, `Spinner`, `EmptyState`, `StatusBadge`, `Card`, `PageHeader`, `StatCard`, `Modal`, `ConfirmDialog` |
| `components/Layouts.jsx` | `PublicLayout` (barra superior), `BusinessLayout` (barra lateral del panel), `RequireRole` (rutas protegidas) |
| `components/SlotPicker.jsx` | Selector de fecha y franjas horarias, reutilizado por el cliente y por el negocio |
| `pages/` | Páginas: `Landing`, `auth/` (Login, Register), `client/` (Directory, BookingPage, MyReservations, Account), `business/` (Dashboard, Reservations, Services, Hours, Clients, ClientDetail, Settings) |
| `utils/` | Formato de fechas/dinero y validaciones del lado del cliente |
| `styles/global.css` | Sistema de diseño con variables CSS y reglas responsive |

## Rutas
| Ruta | Acceso | Página |
|---|---|---|
| `/` | Público | Landing con beneficios, funcionalidades y planes (leídos de la API) |
| `/registro`, `/ingresar` | Público | Registro (negocio/cliente) e inicio de sesión |
| `/reservar`, `/reservar/:slug` | Público (reservar requiere cliente) | Directorio y página de reserva del negocio |
| `/mis-reservas`, `/cuenta` | Rol CLIENT | Reservas y perfil del cliente |
| `/panel`, `/panel/citas`, `/panel/servicios`, `/panel/horarios`, `/panel/clientes`, `/panel/clientes/:id`, `/panel/configuracion` | Rol BUSINESS_ADMIN | Panel del negocio |

`RequireRole` muestra un spinner mientras verifica la sesión, redirige a `/ingresar` si no hay usuario (recordando la
ruta de origen) y redirige al inicio de su rol si el rol no corresponde.

## Manejo de estado
- **Global**: sesión (contexto `AuthContext`) y notificaciones (`ToastContext`).
- **Local**: `useState` en formularios y filtros; `useAsync` para datos remotos con recarga tras cada acción.
- **Persistencia**: el token JWT se guarda en `localStorage` (clave `agenda-facil.token`); al recargar, `AuthContext`
  llama a `/api/auth/me` para reconstruir la sesión.

## Formularios y validación
Validación en el cliente (`utils/validation.js`) para respuesta inmediata y mensajes accesibles (`aria-invalid`,
`role="alert"`); el backend **vuelve a validar todo** con Zod y sus errores por campo se muestran en el mismo formulario.

## Responsive
CSS con *media queries* (1024, 900, 720 y 340 px): en móvil la barra lateral se convierte en menú desplegable, las tablas
se transforman en tarjetas y los modales se muestran como hoja inferior. La prueba E2E verifica que no exista
desbordamiento horizontal en móvil, tablet y escritorio en 11 rutas.

## Preguntas típicas
- **¿Por qué una SPA?** Navegación instantánea sin recargar, y se publica como archivos estáticos en S3 + CloudFront (barato y escalable).
- **¿Cómo funciona el refresco en `/panel/citas` en producción?** Una función de CloudFront reescribe las rutas sin extensión a `index.html`; React Router resuelve la ruta en el navegador.
- **¿Por qué las fechas no se desplazan con la zona horaria del navegador?** La API envía la hora local del negocio (`AAAA-MM-DDTHH:MM`) y el frontend la formatea con `timeZone: 'UTC'`, sin conversión.
