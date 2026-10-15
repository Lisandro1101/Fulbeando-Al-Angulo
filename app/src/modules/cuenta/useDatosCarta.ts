import { useEffect, useState } from 'react'
import type { Equipo, TarjetaSnapshot, Usuario } from '@/domain'
import { calcularMediaJugador, edadDe } from '@/domain'
import { obtenerEquiposDeUsuario, obtenerEstadisticasJugador } from '@/modules/teams/teamService'
import type { DatosTarjeta } from './componentes/TarjetaJugador'

const SIN_STATS = { goles: 0, asistencias: 0, partidosJugados: 0, mvpCount: 0 }

export interface DatosCarta {
  /** Todo lo que pinta `TarjetaJugador`. */
  datos: DatosTarjeta
  /** Los mismos numeros, pero en la forma que se congela al publicar en el muro. */
  snapshot: TarjetaSnapshot
}

/**
 * Consolida las tres fuentes de la carta (perfil del usuario, estadisticas por
 * partido y estadisticas del equipo) en un solo objeto.
 *
 * Es el mismo calculo que antes vivia inline en `Screen4WelcomeCard`; se
 * extrajo para que la carta propia y la publica (`/carta/:uid`) den numeros
 * identicos. Se recalcula en lectura y no escribe nada.
 */
export const useDatosCarta = (usuario: Usuario | null): DatosCarta => {
  const [equipo, setEquipo] = useState<Equipo | null>(null)
  const [statsPartido, setStatsPartido] = useState(SIN_STATS)

  const uid = usuario?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setEquipo(null)
      setStatsPartido(SIN_STATS)
      return
    }
    let vivo = true
    obtenerEquiposDeUsuario(uid)
      .then((equipos) => {
        if (vivo && equipos.length > 0) setEquipo(equipos[0] ?? null)
      })
      .catch(console.error)
    obtenerEstadisticasJugador(uid)
      .then((stats) => {
        if (vivo) setStatsPartido(stats)
      })
      .catch(console.error)
    return () => {
      vivo = false
    }
  }, [uid])

  const perfil = usuario?.perfilDeportivo ?? null
  const statsPerfil = perfil?.stats
  const statsEquipo = (uid && equipo?.estadisticasJugadores?.[uid]) || null

  const goles = Math.max(statsPartido.goles, (statsPerfil?.goals || 0) + (statsEquipo?.goles || 0))
  const asistencias = Math.max(statsPartido.asistencias, (statsPerfil?.assists || 0) + (statsEquipo?.asistencias || 0))
  const partidos = Math.max(statsPartido.partidosJugados, (statsPerfil?.matchesPlayed || 0) + (statsEquipo?.partidosJugados || 0))
  const mvpCount = Math.max(statsPartido.mvpCount, (statsPerfil?.mvpCount || 0) + (statsEquipo?.mvpCount || 0))

  const posicion = perfil?.posicion ?? null
  const media = calcularMediaJugador({ partidosJugados: partidos, goles, asistencias, mvpCount, posicion })
  const edad = usuario ? edadDe(usuario) : null

  const pos = posicion ? posicion.slice(0, 3).toUpperCase() : '--'
  const piernaHabil = perfil?.piernaHabil ?? null
  const pierna = piernaHabil ? piernaHabil.slice(0, 3).toUpperCase() : '--'
  const equipoNombre = equipo?.name ?? ''

  const datos: DatosTarjeta = {
    nombre: usuario?.nombre || 'EL RÚSTICO',
    fotoUrl: usuario?.fotoUrl || '⚽',
    media,
    pos,
    edad: edad ?? '--',
    goles,
    asistencias,
    partidos,
    pierna,
    equipoNombre,
    shieldUrl: equipo?.shieldUrl ?? null,
  }

  const snapshot: TarjetaSnapshot = {
    media,
    posicion,
    edad,
    goles,
    asistencias,
    partidosJugados: partidos,
    mvpCount,
    pierna: piernaHabil,
    equipoNombre: equipoNombre || null,
    shieldUrl: equipo?.shieldUrl ?? null,
  }

  return { datos, snapshot }
}
