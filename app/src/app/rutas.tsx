import { Navigate, createBrowserRouter, useLocation, type RouteObject } from 'react-router-dom';
import { useSesion } from '@/modules/auth/useSesion';

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
import { AdminDashboard } from '@/modules/admin/AdminDashboard';

// Mapa Radar Unificado (único mapa en toda la aplicación)
import { MapaRadarUnificado } from '@/modules/radar/pantallas/MapaRadarUnificado';

/** 
 * Guarda de Autenticación 
 * Asegura que el usuario esté logueado y tenga el rol correcto para acceder.
 */
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { usuario, cargando } = useSesion();
  const location = useLocation();
  
  if (cargando) return <div className="bg-zinc-950 h-full w-screen flex justify-center items-center text-emerald-500">Cargando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  
  if (usuario.rol === 'invitado' && location.pathname !== '/role-selector') {
    return <Navigate to="/role-selector" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.rol || 'jugador')) {
    return <Navigate to="/role-selector" replace />;
  }

  return children;
};

export const rutas: RouteObject[] = [
  // Raíz / Feed / Comunidad
  { path: '/', element: <ProtectedRoute><AlAnguloHome /></ProtectedRoute> },
  
  // Flujo 1: Acceso
  { path: '/login', element: <Screen1Login /> },
  { path: '/role-selector', element: <ProtectedRoute><Screen2RoleSelector /></ProtectedRoute> },
  
  // Flujo 2: Jugador / Capitán
  { path: '/onboarding-player', element: <ProtectedRoute allowedRoles={['jugador']}><Screen3PlayerOnboarding /></ProtectedRoute> },
  
  // Vistas Principales con Bottom Navigation
  { path: '/radar', element: <ProtectedRoute><MapaRadarUnificado /></ProtectedRoute> },
  { path: '/equipo', element: <ProtectedRoute><Screen7MyTeam /></ProtectedRoute> },
  { path: '/partidos', element: <ProtectedRoute><Screen6LaunchChallenge /></ProtectedRoute> },
  { path: '/perfil', element: <ProtectedRoute><Screen4WelcomeCard /></ProtectedRoute> },
  { path: '/turnos', element: <ProtectedRoute><Screen5Reservas /></ProtectedRoute> },
  { path: '/ajustes', element: <ProtectedRoute><Ajustes /></ProtectedRoute> },

  // Flujo de reserva: el mapa navega a /reservar/:predioId y `CargaDeSena`
  // lee el id de `useParams` para cargar la grilla de canchas y turnos.
  { path: '/reservar/:predioId', element: <ProtectedRoute><CargaDeSena /></ProtectedRoute> },

  // Flujo 3: Dueño de Predio.
  // `Rol` solo admite 'invitado' | 'jugador' | 'dueno_predio' | 'superadmin'.
  // Los valores legacy 'dueno' y 'pending_venue' se eliminaron: un invitado que
  // pide ser dueno queda con rol 'invitado' y una fila en `solicitudes`.
  { path: '/venue-registration', element: <ProtectedRoute allowedRoles={['invitado', 'jugador', 'dueno_predio']}><Screen8VenueRegistration /></ProtectedRoute> },
  { path: '/venue-subscription', element: <ProtectedRoute allowedRoles={['dueno_predio']}><Screen9VenueSubscription /></ProtectedRoute> },
  { path: '/venue-dashboard', element: <ProtectedRoute allowedRoles={['dueno_predio', 'superadmin']}><DashboardDueno /></ProtectedRoute> },
  { path: '/dueno', element: <Navigate to="/venue-dashboard" replace /> },

  // Superadmin: destino del boton "MODO SUPERADMIN" de MenuNavegacion.
  { path: '/superadmin', element: <ProtectedRoute allowedRoles={['superadmin']}><AdminDashboard /></ProtectedRoute> },
  
  // Catch all (404)
  { path: '*', element: <Navigate to="/radar" replace /> },
];

export const router = createBrowserRouter(rutas);
