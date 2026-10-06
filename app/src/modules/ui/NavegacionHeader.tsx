import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Shield, User as UserIcon, LogOut, ChevronDown, Check, MapPin, Zap, Building2, UserCheck, ArrowLeft } from 'lucide-react'
import { useSesion } from '@/modules/auth/useSesion'
import { ingresoConEmail, cerrarSesion } from '@/modules/auth/servicio'

const CUENTAS_DEMO = [
  { label: 'Tomi (Organizador / Jugador)', email: 'tomi@fulbeando.test', rol: 'jugador' },
  { label: 'Nico (Suplente Arquero)', email: 'nico@fulbeando.test', rol: 'jugador' },
  { label: 'Elena (Dueña de Predio)', email: 'elena@fulbeando.test', rol: 'dueno' },
  { label: 'Ana (Superadmin)', email: 'admin@fulbeando.test', rol: 'superadmin' },
]

export function NavegacionHeader() {
  const sesion = useSesion()
  const location = useLocation()
  const navigate = useNavigate()
  const [desplegable, setDesplegable] = useState(false)
  const [cambiando, setCambiando] = useState(false)

  const ROOT_ROUTES = [
    '/',
    '/radar',
    '/perfil',
    '/turnos',
    '/equipo',
    '/partidos',
    '/dashboard',
    '/venue-dashboard',
    '/admin',
    '/superadmin',
    '/ajustes'
  ]
  const esRutaRaiz = ROOT_ROUTES.includes(location.pathname) || location.pathname === '/login' || location.pathname === '/role-selector'

  const cambiarCuenta = async (email: string) => {
    try {
      setCambiando(true)
      await ingresoConEmail(email, 'fulbeando123')
      setDesplegable(false)
    } catch (e) {
      console.error('Error al cambiar cuenta demo:', e)
    } finally {
      setCambiando(false)
    }
  }

  const salir = async () => {
    await cerrarSesion()
    setDesplegable(false)
  }

  const esRutaActiva = (ruta: string) => location.pathname === ruta

  return (
    <header className="sticky top-0 z-50 border-b border-ink-faint/20 bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex w-full items-center justify-between px-4 py-3">
        {/* Logo o Botón Volver */}
        {esRutaRaiz ? (
          <Link to="/" className="flex items-center gap-2 text-decoration-none min-h-[44px]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pitch font-black text-canvas shadow-lg shadow-pitch/20">
              ⚽
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-ink">FULBEANDO</span>
              <span className="ml-1.5 rounded-md bg-pitch-faint px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pitch">
                PWA
              </span>
            </div>
          </Link>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas-raised text-ink hover:bg-ink-faint/10 transition-colors shrink-0"
            aria-label="Volver atrás"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        )}

        {/* Navegación Principal */}
        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            to="/radar"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              esRutaActiva('/radar') ? 'bg-pitch-faint text-pitch' : 'text-ink-muted hover:bg-canvas-raised hover:text-ink'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            Canchas
          </Link>
          <Link
            to="/partidos"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              esRutaActiva('/partidos') ? 'bg-pitch-faint text-pitch' : 'text-ink-muted hover:bg-canvas-raised hover:text-ink'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-urgent" />
            Radar & Partidos
          </Link>
          {sesion.usuario?.rol === 'dueno_predio' || sesion.usuario?.rol === 'superadmin' ? (
            <Link
              to="/venue-dashboard"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                esRutaActiva('/venue-dashboard') ? 'bg-pitch-faint text-pitch' : 'text-ink-muted hover:bg-canvas-raised hover:text-ink'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-pitch" />
              Mi Complejo
            </Link>
          ) : null}
          {sesion.usuario?.rol === 'superadmin' && (
            <Link
              to="/superadmin"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                esRutaActiva('/superadmin') ? 'bg-pitch-faint text-pitch' : 'text-ink-muted hover:bg-canvas-raised hover:text-ink'
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-urgent" />
              Superadmin
            </Link>
          )}
        </nav>

        {/* Selector de Sesión / Cuenta Demo */}
        <div className="relative">
          {sesion.user ? (
            <button
              type="button"
              onClick={() => setDesplegable(!desplegable)}
              className="flex items-center gap-2 rounded-xl border border-ink-faint/30 bg-canvas-raised px-3 py-1.5 text-xs font-medium text-ink hover:border-pitch"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-pitch-faint text-pitch">
                <UserIcon className="h-3.5 w-3.5" />
              </div>
              <span className="max-w-[100px] truncate font-semibold sm:max-w-[140px]">
                {sesion.usuario?.nombre ?? sesion.user.displayName ?? 'Usuario'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDesplegable(!desplegable)}
              className="btn-primary py-1.5 text-xs"
            >
              Iniciar Sesión Demo
            </button>
          )}

          {/* Menú Desplegable */}
          {desplegable && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-ink-faint/30 bg-canvas-raised p-2 shadow-xl shadow-black/50 z-50">
              <div className="border-b border-ink-faint/20 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Cambio Rápido de Cuenta Demo
                </p>
              </div>

              <div className="my-1 space-y-1">
                {CUENTAS_DEMO.map((cuenta) => {
                  const activa = sesion.user?.email === cuenta.email
                  return (
                    <button
                      key={cuenta.email}
                      type="button"
                      disabled={cambiando}
                      onClick={() => cambiarCuenta(cuenta.email)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                        activa ? 'bg-pitch-faint text-pitch font-semibold' : 'text-ink hover:bg-canvas'
                      }`}
                    >
                      <span className="truncate">{cuenta.label}</span>
                      {activa && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  )
                })}
              </div>

              <div className="mt-1 border-t border-ink-faint/20 pt-1">
                <Link
                  to="/perfil"
                  onClick={() => setDesplegable(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ink hover:bg-canvas"
                >
                  <UserCheck className="h-3.5 w-3.5 text-ink-muted" />
                  Perfil & Ajustes
                </Link>
                {sesion.user && (
                  <button
                    type="button"
                    onClick={salir}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-occupied hover:bg-canvas"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Cerrar Sesión
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
