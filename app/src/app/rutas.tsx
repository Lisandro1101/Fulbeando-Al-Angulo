import { Navigate, createBrowserRouter, useLocation, type RouteObject } from 'react-router-dom';
import { useSesion } from '@/modules/auth/useSesion';
import { planDuenoActivo, planDuenoPendiente } from '@/domain';

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
  
  if (cargando) return <div className="bg-zinc-950 h-full w-screen flex justify-center items-center text-emerald-500">Cargando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;

  const ruta = location.pathname;
  // Rutas donde el dueno pendiente SI puede estar: el cartel, el selector de
  // rol (para ver el error si reintenta) y el login (para cambiar de cuenta).
  const exentas = ruta === '/login' || ruta === '/role-selector' || ruta === '/plan-pendiente';

  // El superadmin vive en su panel: todavia no hay un menu propio para el, asi
  // que fuera de `/superadmin` no hay nada que mostrarle y cualquier otra ruta
  // lo devuelve. `/login` queda afuera de esta regla para poder cambiar de
  // cuenta (el panel trae su propio "Cerrar Sesion").
  if (usuario.rol === 'superadmin' && ruta !== '/superadmin' && ruta !== '/login') {
    return <Navigate to="/superadmin" replace />;
  }

  if (planDuenoPendiente(usuario) && !exentas) {
    return <Navigate to="/plan-pendiente" replace />;
  }

  if (usuario.rol === 'invitado' && ruta !== '/role-selector') {
    return <Navigate to="/role-selector" replace />;
  }

  if (ruta === '/plan-pendiente') {
    // Plan ya abonado: no hay nada que esperar, entra al panel.
    if (planDuenoActivo(usuario)) return <Navigate to="/venue-dashboard" replace />;
    if (usuario.rol === 'dueno_predio') return children;
    return <Navigate to="/role-selector" replace />;
  }

  if (denyRoles?.includes(usuario.rol)) {
    return <Navigate to={redirectDenegado ?? '/'} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.rol || 'jugador')) {
    return <Navigate to="/role-selector" replace />;
  }

  return children;
};

export const rutas: RouteObject[] = [
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

export const router = createBrowserRouter(rutas);
