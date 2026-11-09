import type { MedallaDeportiva, PerfilDeportivo, PlayerStats } from '@/domain';

export const MEDALLAS_CATALOGO: Record<string, MedallaDeportiva> = {
  fair_play: {
    id: 'fair_play',
    titulo: 'Fair Play Impecable',
    descripcion: 'Conducta intachable y respeto en cada partido jugado.',
    icono: '🛡️',
    rareza: 'epica',
  },
  puntualidad: {
    id: 'puntualidad',
    titulo: 'Puntualidad de Hierro',
    descripcion: 'Llega siempre a horario a las convocatorias y partidos.',
    icono: '⏱️',
    rareza: 'comun',
  },
  goleador: {
    id: 'goleador',
    titulo: 'Goleador Letal',
    descripcion: 'Efectividad y presencia letal en el área rival.',
    icono: '⚽',
    rareza: 'rara',
  },
  asistidor: {
    id: 'asistidor',
    titulo: 'Asistidor Mágico',
    descripcion: 'Gran visión de cancha y pases precisos de gol.',
    icono: '🎯',
    rareza: 'rara',
  },
  mvp: {
    id: 'mvp',
    titulo: 'Figura de la Cancha (MVP)',
    descripcion: 'Elegido el mejor jugador del partido por sus compañeros.',
    icono: '⭐',
    rareza: 'legendaria',
  },
  arquero: {
    id: 'arquero',
    titulo: 'Muralla Bajo los Palos',
    descripcion: 'Seguridad y reflejos impecables defendiendo el arco.',
    icono: '🧤',
    rareza: 'rara',
  },
  veterano: {
    id: 'veterano',
    titulo: 'Referente del Barrio',
    descripcion: 'Compromiso y trayectoria con más de 10 partidos disputados.',
    icono: '👑',
    rareza: 'legendaria',
  },
  crack: {
    id: 'crack',
    titulo: 'Crack del Sintético',
    descripcion: 'Habilidad destacada con valoración superior a 80.',
    icono: '⚡',
    rareza: 'epica',
  },
};

/**
 * Calcula las medallas obtenidas por un jugador en base a su perfil deportivo y estadísticas reales.
 */
export function calcularMedallasJugador(
  perfil?: PerfilDeportivo | null,
  fairPlayPct: number = 100,
  mediaFifa: number = 70
): MedallaDeportiva[] {
  const medallas: MedallaDeportiva[] = [];
  const stats: PlayerStats = perfil?.stats ?? {
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    mvpCount: 0,
    fairPlayIndex: 100,
  };

  // 1. Fair Play: Si el score es mayor o igual a 88
  if (fairPlayPct >= 88) {
    medallas.push(MEDALLAS_CATALOGO.fair_play!);
  }

  // 2. Puntualidad: Al menos 2 partidos jugados
  if (stats.matchesPlayed >= 2) {
    medallas.push(MEDALLAS_CATALOGO.puntualidad!);
  }

  // 3. Goleador: Al menos 3 goles
  if (stats.goals >= 3) {
    medallas.push(MEDALLAS_CATALOGO.goleador!);
  }

  // 4. Asistidor: Al menos 2 asistencias
  if ((stats.assists ?? 0) >= 2) {
    medallas.push(MEDALLAS_CATALOGO.asistidor!);
  }

  // 5. MVP: Al menos 1 vez figura
  if (stats.mvpCount >= 1) {
    medallas.push(MEDALLAS_CATALOGO.mvp!);
  }

  // 6. Arquero: Posición arquero o rol GK y al menos 1 partido
  const esArquero =
    perfil?.posicion === 'arquero' ||
    perfil?.playerRole === 'GK';
  if (esArquero && stats.matchesPlayed >= 1) {
    medallas.push(MEDALLAS_CATALOGO.arquero!);
  }

  // 7. Veterano: Al menos 8 partidos jugados
  if (stats.matchesPlayed >= 8) {
    medallas.push(MEDALLAS_CATALOGO.veterano!);
  }

  // 8. Crack: Media 75 o superior
  if (mediaFifa >= 75) {
    medallas.push(MEDALLAS_CATALOGO.crack!);
  }

  // Si aún no tiene partidos o medallas ganadas, le otorgamos la medalla de bienvenida "Fair Play" y "Puntualidad" en desarrollo
  if (medallas.length === 0) {
    medallas.push(MEDALLAS_CATALOGO.fair_play!);
  }

  return medallas;
}

const COLOR_RAREZA: Record<string, { bg: string; border: string; text: string }> = {
  comun: {
    bg: 'bg-slate-800/80',
    border: 'border-slate-600/60',
    text: 'text-slate-200',
  },
  rara: {
    bg: 'bg-blue-950/60',
    border: 'border-blue-500/40',
    text: 'text-blue-300',
  },
  epica: {
    bg: 'bg-purple-950/60',
    border: 'border-purple-500/40',
    text: 'text-purple-300',
  },
  legendaria: {
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
  },
};

/**
 * Componente visual para mostrar las medallas deportivas y Fair Play del jugador.
 */
export function MedalleroDeportivo({
  medallas,
  className = '',
  mostrarTitulo = true,
}: {
  medallas: MedallaDeportiva[];
  className?: string;
  mostrarTitulo?: boolean;
}) {
  return (
    <div className={`w-full ${className}`}>
      {mostrarTitulo && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            🏅 Medallero Deportivo & Fair Play
          </span>
          <span className="text-[11px] font-semibold text-emerald-400">
            {medallas.length} {medallas.length === 1 ? 'insignia' : 'insignias'}
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {medallas.map((m) => {
          const estilo = COLOR_RAREZA[m.rareza] ?? COLOR_RAREZA.comun!;
          return (
            <div
              key={m.id}
              className={`flex items-center gap-2.5 p-2 rounded-xl border ${estilo.bg} ${estilo.border} shadow-sm text-left`}
              title={m.descripcion}
            >
              <span className="text-xl shrink-0 select-none">{m.icono}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold truncate ${estilo.text}`}>{m.titulo}</p>
                <p className="text-[10px] text-zinc-400 line-clamp-1 leading-tight">{m.descripcion}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
