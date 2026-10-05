import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { useSesion } from '@/modules/auth/useSesion';

// Importación de las pantallas unificadas
import { 
  Screen1Login, 
  Screen2RoleSelector,
  Screen3PlayerOnboarding,
  Screen4WelcomeCard,
  Screen6LaunchChallenge,
  Screen7MyTeam,
  Screen8VenueRegistration,
  Screen9VenueSubscription
} from '@/modules/ui/Screens';
import DashboardDueno from '@/modules/predios/pantallas/DashboardDueno';

// Mapa Radar Unificado (único mapa en toda la aplicación)
import { MapaRadarUnificado } from '@/modules/radar/pantallas/MapaRadarUnificado';

/** 
 * Guarda de Autenticación 
 * Asegura que el usuario esté logueado y tenga el rol correcto para acceder.
 */
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { usuario, cargando } = useSesion();
  
  if (cargando) return <div className="bg-zinc-950 h-full w-screen flex justify-center items-center text-emerald-500">Cargando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(usuario.rol || 'jugador')) {
    return <Navigate to="/role-selector" replace />;
  }

  return children;
};

export const rutas: RouteObject[] = [
  // Raíz redirige al radar
  { path: '/', element: <Navigate to="/radar" replace /> },
  
  // Flujo 1: Acceso
  { path: '/login', element: <Screen1Login /> },
  { path: '/role-selector', element: <ProtectedRoute><Screen2RoleSelector /></ProtectedRoute> },
  
  // Flujo 2: Jugador / Capitán
  { path: '/onboarding-player', element: <ProtectedRoute allowedRoles={['jugador']}><Screen3PlayerOnboarding /></ProtectedRoute> },
  
  // Vistas Principales con Bottom Navigation
  { path: '/radar', element: <ProtectedRoute allowedRoles={['jugador']}><MapaRadarUnificado /></ProtectedRoute> },
  { path: '/equipo', element: <ProtectedRoute allowedRoles={['jugador']}><Screen7MyTeam /></ProtectedRoute> },
  { path: '/partidos', element: <ProtectedRoute allowedRoles={['jugador']}><Screen6LaunchChallenge /></ProtectedRoute> },
  { path: '/perfil', element: <ProtectedRoute allowedRoles={['jugador']}><Screen4WelcomeCard /></ProtectedRoute> },

  // Flujo 3: Dueño de Predio
  { path: '/venue-registration', element: <ProtectedRoute allowedRoles={['dueno_predio', 'pending_venue']}><Screen8VenueRegistration /></ProtectedRoute> },
  { path: '/venue-subscription', element: <ProtectedRoute allowedRoles={['dueno_predio', 'pending_venue']}><Screen9VenueSubscription /></ProtectedRoute> },
  { path: '/venue-dashboard', element: <ProtectedRoute allowedRoles={['dueno_predio']}><DashboardDueno /></ProtectedRoute> },
  
  // Catch all (404)
  { path: '*', element: <Navigate to="/radar" replace /> },
];

export const router = createBrowserRouter(rutas);
