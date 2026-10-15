import { createContext, useContext, useEffect, useMemo, useState, createElement, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import type { Actor, Usuario } from '@/domain'
import { asegurarUsuario, obtenerUsuario } from '@/modules/usuarios/repositorio'
import { idsDePredios } from '@/modules/predios/repositorio'
import { getRedirectResult } from 'firebase/auth'
import { auth } from '@/core/firebase'
import { consumirFechaNacimientoDeAlta, observarSesion } from './servicio'

export interface EstadoSesion {
  cargando: boolean
  user: User | null
  usuario: Usuario | null
  /** Permisos ya resueltos, listos para las reglas y para la UI. */
  actor: Actor | null
  error: string | null
  refrescar?: () => Promise<void>
}

const INICIAL: EstadoSesion = { cargando: true, user: null, usuario: null, actor: null, error: null }

const SesionContext = createContext<EstadoSesion>(INICIAL)

let redirectPromise: Promise<void> | null = null

function verificarRedireccionGoogle() {
  if (!redirectPromise) {
    redirectPromise = getRedirectResult(auth)
      .then((redirectResult) => {
        if (redirectResult) {
          console.log("Resultado de redirección:", redirectResult.user)
        }
      })
      .catch((err) => {
        console.error("Error capturado tras la redirección:", err)
      })
  }
  return redirectPromise
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>(INICIAL)

  const recargar = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return
    try {
      const u = await obtenerUsuario(currentUser.uid)
      if (u) {
        const prediosIds = u.rol === 'dueno_predio' ? await idsDePredios(u.uid) : []
        setEstado((prev) => ({
          ...prev,
          usuario: u,
          actor: { uid: u.uid, rol: u.rol, prediosIds },
        }))
      }
    } catch (e) {
      console.error('Error al refrescar usuario:', e)
    }
  }

  useEffect(() => {
    let montado = true

    // Captura una sola vez si hubo redirección OAuth de Google
    void verificarRedireccionGoogle()

    const alCambiar = async (user: User | null) => {
      if (!montado) return
      if (!user) {
        setEstado({ ...INICIAL, cargando: false })
        return
      }

      try {
        // Una sola lectura: `asegurarUsuario` devuelve el doc si ya existia, y
        // si hay que crearlo lo escribe con la fecha de nacimiento del registro
        // en ese mismo batch (cero escrituras extra).
        const usuario = await asegurarUsuario(
          user.uid,
          {
            nombre: (user.displayName ?? 'Jugador').split(' ')[0] ?? 'Jugador',
            apellido: user.displayName?.split(' ').slice(1).join(' ') ?? '',
            email: user.email ?? '',
          },
          'invitado',
          consumirFechaNacimientoDeAlta(),
        )

        // Solo `dueno_predio`: el rol 'dueno' del modelo legacy ya no existe en `Rol`.
        const prediosIds = usuario?.rol === 'dueno_predio' ? await idsDePredios(user.uid) : []

        if (montado) {
          setEstado({
            cargando: false,
            user,
            usuario,
            actor: usuario ? { uid: usuario.uid, rol: usuario.rol, prediosIds } : null,
            error: null,
            refrescar: recargar,
          })
        }
      } catch (error) {
        if (montado) {
          setEstado({
            ...INICIAL,
            cargando: false,
            user,
            error: mensajeDe(error, 'Error al cargar el perfil.'),
            refrescar: recargar,
          })
        }
      }
    }

    try {
      const desuscribir = observarSesion(alCambiar)
      return () => {
        montado = false
        desuscribir?.()
      }
    } catch (error) {
      setEstado({ ...INICIAL, cargando: false, error: mensajeDe(error, 'Error al iniciar sesion.') })
      return undefined
    }
  }, [])

  const valor = useMemo(() => estado, [estado])

  return createElement(SesionContext.Provider, { value: valor }, children)
}

/**
 * Hook para sincronizar componentes con la sesión global provista por SesionProvider.
 */
export function useSesion(): EstadoSesion {
  return useContext(SesionContext)
}

const mensajeDe = (error: unknown, porDefecto: string): string =>
  error instanceof Error ? error.message : porDefecto
