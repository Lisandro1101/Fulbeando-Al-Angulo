import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom'
import Landing from '@/modules/publico/pantallas/Landing'
// Mantenemos componentes de Fulbeando accesibles para la Fase 3
import DashboardJugador from '@/modules/jugador/pantallas/DashboardJugador'
import CargaDeSena from '@/modules/turnos/pantallas/CargaDeSena'
import DashboardDueno from '@/modules/predios/pantallas/DashboardDueno'
import Ajustes from '@/modules/cuenta/pantallas/Ajustes'

// --- RUTAS AL ÁNGULO FUSIONADAS ---
import { AdminDashboard } from '@/modules/admin/AdminDashboard'
import AlAnguloHome from '@/modules/ui/AlAnguloHome'
import { ChatRoom } from '@/modules/chat/ChatRoom'

export const rutas: RouteObject[] = [
  { path: '/', element: <Landing /> },
  
  // Ruteo Principal (PWA): Ahora apunta a Al Ángulo
  { path: '/dashboard', element: <AlAnguloHome /> },
  
  // Dashboard SuperAdmin fusionado
  { path: '/superadmin', element: <AdminDashboard /> },
  
  // Demo del chat
  { path: '/chat', element: <ChatRoom matchId="demo" currentUserId="1" currentUserName="Messi" rivalName="Los Pibes FC" matchDate="HOY 20:00" /> },

  // Rutas Legacy (Fulbeando / Fase 3)
  { path: '/reservas-legacy', element: <DashboardJugador /> },
  { path: '/reservar', element: <CargaDeSena /> },
  { path: '/reservar/:predioId', element: <CargaDeSena /> },
  { path: '/admin-predios', element: <DashboardDueno /> },
  { path: '/ajustes', element: <Ajustes /> },
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(rutas)