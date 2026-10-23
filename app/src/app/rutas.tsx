import { Navigate, Outlet, createBrowserRouter, useLocation, useRouteError, type RouteObject } from 'react-router-dom';
import { useSesion } from '@/modules/auth/useSesion';
import { planDuenoActivo, planDuenoPendiente, esEmailSuperadmin } from '@/domain';
import { CargandoFulbeando, ProveedorTransicion } from '@/modules/ui/overlays';

// Importación de las pantallas unificadas
import { 
  Screen1Login, 
  Screen2RoleSelector,
  Screen3PlayerOnboarding,
  Screen4WelcomeCard,
  Screen5Reservas,
  Screen6LaunchChallenge,
  Screen7MyTeam,
  Screen8VenueRegistration,
  Screen9VenueSubscription
} from '@/modules/ui/Screens';
import DashboardDueno from '@/modules/predios/pantallas/DashboardDueno';
import AlAnguloHome from '@/modules/ui/AlAnguloHome';
import CargaDeSena from '@/modules/turnos/pantallas/CargaDeSena';
import Ajustes from '@/modules/cuenta/pantallas/Ajustes';
import PlanPendiente from '@/modules/cuenta/pantallas/PlanPendiente';
import CartaPublica from '@/modules/cuenta/pantallas/CartaPublica';
import { AppLayout } from '@/app/AppLayout';
// Dashboard del superadmin: el diseno original (sidebar oscuro, KPI grid y
// Sala de Arbitraje) con los numeros reales de Firestore y las colas de
// trabajo (solicitudes de dueno y verificacion de predios).
import { AdminDashboard } from '@/modules/admin/AdminDashboard';

// Mapa Radar Unificado (único mapa en toda la aplicación)
import { MapaRadarUnificado } from '@/modules/radar/pantallas/MapaRadarUnificado';

/** 
 * Guarda de Autenticación 
 * Asegura que el usuario esté logueado y tenga el rol correcto para acceder.
 *
 * Tres filtros, en este orden:
 *   1. Plan del dueno: sin plan activo no hay pantalla para el, salvo el
 *      cartel de contacto (`/plan-pendiente`), que es exenta. Esto cubre TODA
 *      la app de una sola vez: un dueno pendiente no llega ni a `/venue-*`.
 *   2. Rol que no puede entrar (`denyRoles`): se manda a una salida segura
 *      (nunca a `/role-selector`, porque un rol ya asignado rebotaria aca).
 *   3. Roles permitidos (`allowedRoles`).
 */
const ProtectedRoute = ({
  children,
  allowedRoles,
  denyRoles,
  redirectDenegado,
}: {
  children: JSX.Element
  allowedRoles?: string[]
  denyRoles?: string[]
  redirectDenegado?: string
}) => {
  const { usuario, cargando } = useSesion();
  const location = useLocation();
  
  if (cargando) return <CargandoFulbeando />;
  if (!usuario) return <Navigate to="/login" replace />;

  const ruta = location.pathname;
  const esSuper = usuario.rol === 'superadmin' || esEmailSuperadmin(usuario.email);

  // El superadmin vive en su panel: fuera de /superadmin no hay nada que mostrarle
  if (esSuper && ruta !== '/superadmin' && ruta !== '/login') {
    return <Navigate to="/superadmin" replace />;
  }

  // Rutas donde el dueno pendiente SI puede estar: el cartel, el selector de
  // rol (para ver el error si reintenta) y el login (para cambiar de cuenta).
  const exentas = ruta === '/login' || ruta === '/role-selector' || ruta === '/plan-pendiente';

  if (!esSuper && planDuenoPendiente(usuario) && !exentas) {
    return <Navigate to="/plan-pendiente" replace />;
  }

  if (!esSuper && usuario.rol === 'invitado' && ruta !== '/role-selector') {
    return <Navigate to="/role-selector" replace />;
  }

  if (ruta === '/plan-pendiente') {
    // Plan ya abonado: no hay nada que esperar, entra al panel.
    if (planDuenoActivo(usuario)) return <Navigate to="/venue-dashboard" replace />;
    if (usuario.rol === 'dueno_predio') return children;
    return <Navigate to="/role-selector" replace />;
  }

  if (!esSuper && denyRoles?.includes(usuario.rol)) {
    return <Navigate to={redirectDenegado ?? '/'} replace />;
  }

  if (allowedRoles && !esSuper && !allowedRoles.includes(usuario.rol || 'jugador')) {
    return <Navigate to="/role-selector" replace />;
  }

  return children;
};

const rutasHijas: RouteObject[] = [
  // Flujo 1: Acceso (Sin Layout Principal)
  { path: '/login', element: <Screen1Login /> },
  { path: '/role-selector', element: <ProtectedRoute><Screen2RoleSelector /></ProtectedRoute> },
  { path: '/plan-pendiente', element: <ProtectedRoute><PlanPendiente /></ProtectedRoute> },
  // Panel del superadmin: FUERA de AppLayout a proposito, para que no herede
  // el MenuNavegacion ni la cabecera de jugador. Su navegacion es la propia de
  // la pantalla (Pantalla + el boton de salir del header).
  {
    path: '/superadmin',
    element: <ProtectedRoute allowedRoles={['superadmin']}><AdminDashboard /></ProtectedRoute>,
  },
  { path: '/onboarding-player', element: <ProtectedRoute allowedRoles={['jugador']}><Screen3PlayerOnboarding /></ProtectedRoute> },
  
  // Rutas con Layout Principal (AppLayout tiene el MenuNavegacion y los Modales)
  { 
    element: <AppLayout />, 
    children: [
      { path: '/', element: <ProtectedRoute><AlAnguloHome /></ProtectedRoute> },
      { path: '/radar', element: <ProtectedRoute denyRoles={['dueno_predio']} redirectDenegado="/venue-dashboard"><MapaRadarUnificado /></ProtectedRoute> },
      { path: '/equipo', element: <ProtectedRoute denyRoles={['dueno_predio']} redirectDenegado="/venue-dashboard"><Screen7MyTeam /></ProtectedRoute> },
      { path: '/partidos', element: <ProtectedRoute denyRoles={['dueno_predio']} redirectDenegado="/venue-dashboard"><Screen6LaunchChallenge /></ProtectedRoute> },
      { path: '/perfil', element: <ProtectedRoute denyRoles={['dueno_predio']} redirectDenegado="/venue-dashboard"><Screen4WelcomeCard /></ProtectedRoute> },
      { path: '/carta/:uid', element: <ProtectedRoute denyRoles={['dueno_predio']} redirectDenegado="/venue-dashboard"><CartaPublica /></ProtectedRoute> },
      { path: '/turnos', element: <ProtectedRoute denyRoles={['dueno_predio']} redirectDenegado="/venue-dashboard"><Screen5Reservas /></ProtectedRoute> },
      { path: '/ajustes', element: <ProtectedRoute><Ajustes /></ProtectedRoute> },
      { path: '/reservar/:predioId', element: <ProtectedRoute denyRoles={['dueno_predio']} redirectDenegado="/venue-dashboard"><CargaDeSena /></ProtectedRoute> },
      
      // Alta de predio: solo el dueno con el plan activo. Un jugador no puede
      // convertirse en dueno cargando su complejo: el rol se elige en el
      // registro, y desde ahi pasa por el cartel de contacto.
      { path: '/venue-registration', element: <ProtectedRoute allowedRoles={['invitado', 'dueno_predio']}><Screen8VenueRegistration /></ProtectedRoute> },
      { path: '/venue-subscription', element: <ProtectedRoute allowedRoles={['dueno_predio']}><Screen9VenueSubscription /></ProtectedRoute> },
      { path: '/venue-dashboard', element: <ProtectedRoute allowedRoles={['dueno_predio', 'superadmin']}><DashboardDueno /></ProtectedRoute> },
      { path: '/dueno', element: <Navigate to="/venue-dashboard" replace /> },
    ]
  },
  
  // Catch all (404)
  { path: '*', element: <Navigate to="/radar" replace /> },
];

function PaginaErrorGlobal() {
  const error: any = useRouteError();
  const mensajeError = error?.message || error?.statusText || (typeof error === 'string' ? error : 'Error inesperado');

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#1E0D4A] p-6 text-center text-white font-sans selection:bg-emerald-500 selection:text-black">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 border border-white/10 shadow-[0_0_50px_rgba(16,185,129,0.2)] backdrop-blur-xl">
        <span className="text-5xl animate-pulse">⚽</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
        ¡Pausa en el partido!
      </h1>
      <p className="max-w-md text-sm sm:text-base text-zinc-300 mb-6">
        Hubo una interrupción momentánea de conexión en la sesión. No te preocupes, tus datos están a salvo.
      </p>

      {import.meta.env.DEV && (
        <div className="mb-6 max-w-lg w-full rounded-xl bg-black/40 border border-white/10 p-3 text-left font-mono text-xs text-rose-300 overflow-x-auto max-h-32">
          {mensajeError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 py-3 px-5 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          Reconectar / Recargar
        </button>
        <button
          onClick={() => { window.location.href = '/'; }}
          className="py-3 px-5 rounded-xl font-semibold bg-white/10 hover:bg-white/15 border border-white/15 text-white transition active:scale-95 cursor-pointer"
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  );
}

export const rutas: RouteObject[] = [
  {
    element: (
      <ProveedorTransicion>
        <Outlet />
      </ProveedorTransicion>
    ),
    errorElement: <PaginaErrorGlobal />,
    children: rutasHijas,
  },
];

export const router = createBrowserRouter(rutas, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});
