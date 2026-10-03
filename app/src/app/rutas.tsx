import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { useSesion } from '@/modules/auth/useSesion';

// Importación de las 10 pantallas (simuladas desde nuestro archivo centralizado Screens)
import { 
  Screen1Login, 
  Screen2RoleSelector,
  Screen3PlayerOnboarding,
  Screen4WelcomeCard,
  Screen5Radar,
  Screen6LaunchChallenge,
  Screen7MyTeam,
  Screen8VenueRegistration,
  Screen9VenueSubscription,
  Screen10VenueDashboard
} from '@/modules/ui/Screens';

/** 
 * Guarda de Autenticación 
 * Asegura que el usuario esté logueado y tenga el rol correcto para acceder.
 */
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { usuario, cargando } = useSesion();
  
  if (cargando) return <div className="bg-zinc-950 h-screen w-screen flex justify-center items-center text-emerald-500">Cargando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  
  // Si se requiere un rol especifico y no lo tiene (nota: en tu app mapearemos esto con usuario.rol)
  if (allowedRoles && !allowedRoles.includes(usuario.rol || 'jugador')) {
    return <Navigate to="/role-selector" replace />;
  }

  return children;
};

export const rutas: RouteObject[] = [
  { path: '/', element: <Navigate to="/login" replace /> },
  
  // Flujo 1: Acceso
  { path: '/login', element: <Screen1Login /> },
  { path: '/role-selector', element: <ProtectedRoute><Screen2RoleSelector /></ProtectedRoute> },
  
  // Flujo 2: Jugador / Capitán
  { path: '/onboarding-player', element: <ProtectedRoute allowedRoles={['jugador']}><Screen3PlayerOnboarding /></ProtectedRoute> },
  { path: '/welcome', element: <ProtectedRoute allowedRoles={['jugador']}><Screen4WelcomeCard /></ProtectedRoute> },
  { path: '/radar', element: <ProtectedRoute allowedRoles={['jugador']}><Screen5Radar /></ProtectedRoute> },
  { path: '/radar/challenge', element: <ProtectedRoute allowedRoles={['jugador']}><Screen6LaunchChallenge /></ProtectedRoute> },
  { path: '/my-team', element: <ProtectedRoute allowedRoles={['jugador']}><Screen7MyTeam /></ProtectedRoute> },

  // Flujo 3: Dueño de Predio
  { path: '/venue-registration', element: <ProtectedRoute allowedRoles={['dueno_predio', 'pending_venue']}><Screen8VenueRegistration /></ProtectedRoute> },
  { path: '/venue-subscription', element: <ProtectedRoute allowedRoles={['dueno_predio', 'pending_venue']}><Screen9VenueSubscription /></ProtectedRoute> },
  { path: '/venue-dashboard', element: <ProtectedRoute allowedRoles={['dueno_predio']}><Screen10VenueDashboard /></ProtectedRoute> },
  
  { path: '*', element: <Navigate to="/login" replace /> },
];

export const router = createBrowserRouter(rutas);