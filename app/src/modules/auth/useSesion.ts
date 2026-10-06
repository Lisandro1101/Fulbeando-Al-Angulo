import { useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import type { Actor, Usuario } from '@/domain'
import { asegurarUsuario, obtenerUsuario } from '@/modules/usuarios/repositorio'
import { idsDePredios } from '@/modules/predios/repositorio'
import { getRedirectResult } from 'firebase/auth'
import { auth } from '@/core/firebase'
import { observarSesion } from './servicio'

export interface EstadoSesion {
  cargando: boolean
  user: User | null
  usuario: Usuario | null
  /** Permisos ya resueltos, listos para las reglas y para la UI. */
  actor: Actor | null
  error: string | null
}

const INICIAL: EstadoSesion = { cargando: true, user: null, usuario: null, actor: null, error: null }

/**
 * Sincroniza la sesion de Firebase Auth con el doc de `usuarios`.
 * El primer ingreso crea el perfil en Firestore con rol jugador.
 */
export function useSesion(): EstadoSesion {
  const [estado, setEstado] = useState<EstadoSesion>(INICIAL)

  useEffect(() => {
    const alCambiar = async (user: User | null) => {
      // Intentamos capturar posibles errores de la redirección de Google
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult) {
          console.log("Resultado de redirección:", redirectResult.user);
        }
      } catch (err) {
        console.error("Error capturado tras la redirección:", err);
      }

      if (!user) {
        setEstado({ ...INICIAL, cargando: false })
        return
      }
      try {
        await asegurarUsuario(user.uid, {
          nombre: (user.displayName ?? 'Jugador').split(' ')[0] ?? 'Jugador',
          apellido: user.displayName?.split(' ').slice(1).join(' ') ?? '',
          email: user.email ?? '',
        }, 'invitado')

        const usuario = await obtenerUsuario(user.uid)
        // Solo `dueno_predio`: el rol 'dueno' del modelo legacy ya no existe en `Rol`.
        const prediosIds = usuario?.rol === 'dueno_predio' ? await idsDePredios(user.uid) : []

        setEstado({
          cargando: false,
          user,
          usuario,
          actor: usuario ? { uid: usuario.uid, rol: usuario.rol, prediosIds } : null,
          error: null,
        })
      } catch (error) {
        setEstado({
          ...INICIAL,
          cargando: false,
          user,
          error: mensajeDe(error, 'Error al cargar el perfil.'),
        })
      }
    }

    // Falta de configuracion de Firebase: se informa en pantalla en vez de romper.
    try {
      return observarSesion(alCambiar)
    } catch (error) {
      setEstado({ ...INICIAL, cargando: false, error: mensajeDe(error, 'Error al iniciar sesion.') })
      return undefined
    }
  }, [])

  return useMemo(() => estado, [estado])
}

const mensajeDe = (error: unknown, porDefecto: string): string =>
  error instanceof Error ? error.message : porDefecto
