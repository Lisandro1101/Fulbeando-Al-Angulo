import { useState, useEffect } from 'react';
import { X, Swords, Calendar, Clock, MapPin, Send, Shield, AlertCircle, Loader2 } from 'lucide-react';
import type { ModalidadDesafio } from '@/domain';
import { obtenerEquiposDeUsuario, enviarDesafioDirectoEquipo } from '@/modules/teams/teamService';
import { calcularDivisionEquipo } from '@/domain/equipo';

interface ModalProponerDesafioProps {
  abierto: boolean;
  onCerrar: () => void;
  rival: {
    equipoId: string;
    nombre: string;
    modalidad?: string;
    escudoUrl?: string | null;
    captainId?: string;
    divisionInfo?: { nombre: string; color: string; badge: string };
  };
  usuarioActual: {
    uid: string;
    nombre?: string;
    apellido?: string;
  };
  onDesafioEnviado?: (mensaje: string) => void;
}

const CHIPS_HORARIOS = [
  'Hoy 20:00 hs',
  'Mañana 21:00 hs',
  'Este Viernes 20:30 hs',
  'Este Sábado 18:00 hs',
  'Este Domingo 19:00 hs',
];

const CHIPS_PINGS = [
  '¿Sale amistoso parejo este finde? ⚽',
  'Tenemos pecheras y pelota 👕',
  '¿Tienen arquero o atajan todos? 🧤',
  'Jugamos con tercer tiempo 🍺',
];

export const ModalProponerDesafio = ({
  abierto,
  onCerrar,
  rival,
  usuarioActual,
  onDesafioEnviado,
}: ModalProponerDesafioProps) => {
  const [misEquipos, setMisEquipos] = useState<any[]>([]);
  const [cargandoEquipos, setCargandoEquipos] = useState(true);
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState<string>('');
  
  const [modalidad, setModalidad] = useState<ModalidadDesafio>('F5');
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(CHIPS_HORARIOS[2]);
  const [horarioPersonalizado, setHorarioPersonalizado] = useState('');
  const [usarPersonalizado, setUsarPersonalizado] = useState(false);
  
  const [canchaOpcion, setCanchaOpcion] = useState<'con_cancha' | 'busca_cancha' | 'rival_propone'>('busca_cancha');
  const [predioNombre, setPredioNombre] = useState('');

  const [pingSeleccionado, setPingSeleccionado] = useState<string>(CHIPS_PINGS[0]);
  const [pingLibre, setPingLibre] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto || !usuarioActual?.uid) return;
    setCargandoEquipos(true);
    setError(null);
    obtenerEquiposDeUsuario(usuarioActual.uid)
      .then((eqs) => {
        setMisEquipos(eqs);
        if (eqs.length > 0) {
          // Pre-selecciona el primer equipo donde sea capitán o miembro
          const cap = eqs.find((e) => e.captainId === usuarioActual.uid) || eqs[0];
          setEquipoSeleccionadoId(cap.id);
          if (cap.formato && ['F5', 'F7', 'F8', 'F11'].includes(cap.formato)) {
            setModalidad(cap.formato as ModalidadDesafio);
          }
        }
      })
      .catch((err) => {
        console.error('Error cargando equipos:', err);
        setError('No pudimos cargar tus equipos.');
      })
      .finally(() => setCargandoEquipos(false));
  }, [abierto, usuarioActual?.uid]);

  if (!abierto) return null;

  const equipoEmisor = misEquipos.find((e) => e.id === equipoSeleccionadoId);
  const divisionEmisor = equipoEmisor ? calcularDivisionEquipo(equipoEmisor) : null;

  const handleEnviar = async () => {
    if (!equipoEmisor) {
      setError('Tenés que seleccionar un equipo para lanzar el desafío.');
      return;
    }
    const capIdRival = rival.captainId;
    if (!capIdRival) {
      setError('Este equipo no tiene un capitán asignado para recibir el desafío.');
      return;
    }

    const fechaFinal = usarPersonalizado ? horarioPersonalizado.trim() : horarioSeleccionado;
    if (!fechaFinal) {
      setError('Por favor indicá un día y horario tentativo.');
      return;
    }

    const pingFinal = pingLibre.trim() || pingSeleccionado;

    setEnviando(true);
    setError(null);

    try {
      const nombreUsuario = `${usuarioActual.nombre || ''} ${usuarioActual.apellido || ''}`.trim() || 'Capitán';
      await enviarDesafioDirectoEquipo(
        usuarioActual.uid,
        nombreUsuario,
        {
          id: equipoEmisor.id,
          nombre: equipoEmisor.name || equipoEmisor.nombre || 'Mi Equipo',
          escudoUrl: equipoEmisor.shieldUrl || equipoEmisor.escudoUrl || null,
          division: divisionEmisor?.nombre,
        },
        {
          id: rival.equipoId,
          nombre: rival.nombre,
          escudoUrl: rival.escudoUrl ?? null,
          captainId: capIdRival,
        },
        {
          modalidad,
          fechaTentativa: fechaFinal,
          fechaUnix: Date.now() + 24 * 3600 * 1000,
          canchaOpcion,
          predioNombre: canchaOpcion === 'con_cancha' ? predioNombre.trim() : undefined,
          pingInicial: pingFinal,
        }
      );

      onDesafioEnviado?.(`¡Desafío enviado a ${rival.nombre}! Te avisaremos cuando respondan ⚽`);
      onCerrar();
    } catch (err: any) {
      console.error('Error enviando desafío:', err);
      setError(err?.message || 'Hubo un error al enviar el desafío.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-left my-auto">
        
        {/* Botón Cerrar */}
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Pactar Partido Rápido
            </h2>
            <p className="text-xs text-zinc-400">
              Protocolo directo capitán a capitán sin vueltas
            </p>
          </div>
        </div>

        {/* Tarjeta del Rival */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-amber-500/50 flex items-center justify-center overflow-hidden shrink-0">
              {rival.escudoUrl ? (
                <img src={rival.escudoUrl} alt={rival.nombre} className="w-full h-full object-cover" />
              ) : (
                <Shield className="w-6 h-6 text-amber-500" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-black text-amber-500 block">
                Equipo Rival
              </span>
              <h4 className="text-white font-black text-base truncate">{rival.nombre}</h4>
              {rival.divisionInfo && (
                <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full border mt-0.5 ${rival.divisionInfo.badge} ${rival.divisionInfo.color}`}>
                  {rival.divisionInfo.nombre}
                </span>
              )}
            </div>
          </div>
          <span className="text-2xl shrink-0 ml-2">⚽</span>
        </div>

        {/* Selector de Mi Equipo (si tiene más de 1) */}
        {cargandoEquipos ? (
          <div className="flex items-center justify-center py-4 text-zinc-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando tus equipos...
          </div>
        ) : misEquipos.length === 0 ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-xs text-red-200 font-bold mb-1">No tenés ningún equipo creado</p>
            <p className="text-[11px] text-zinc-400">
              Para desafiar a otros equipos necesitás ser capitán o integrar un equipo en Fulbeando.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {misEquipos.length > 1 && (
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  ¿Con qué equipo desafiás?
                </label>
                <select
                  value={equipoSeleccionadoId}
                  onChange={(e) => setEquipoSeleccionadoId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                >
                  {misEquipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name || eq.nombre} {eq.captainId === usuarioActual.uid ? '👑 (Capitán)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector de Modalidad */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Modalidad de Juego
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['F5', 'F7', 'F8', 'F11'] as ModalidadDesafio[]).map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setModalidad(mod)}
                    className={`py-2 rounded-xl text-xs font-black transition active:scale-95 border ${
                      modalidad === mod
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {mod}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Día y Hora tentativa */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Día y Horario sugerido
                </span>
                <button
                  type="button"
                  onClick={() => setUsarPersonalizado(!usarPersonalizado)}
                  className="text-amber-400 hover:underline text-[10px] font-bold"
                >
                  {usarPersonalizado ? 'Ver sugerencias rápidas' : 'Personalizar'}
                </button>
              </label>

              {!usarPersonalizado ? (
                <div className="flex flex-wrap gap-1.5">
                  {CHIPS_HORARIOS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setHorarioSeleccionado(chip)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 border ${
                        horarioSeleccionado === chip
                          ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Ej: Sábado a las 20:30 hs"
                  value={horarioPersonalizado}
                  onChange={(e) => setHorarioPersonalizado(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-zinc-600"
                />
              )}
            </div>

            {/* Cancha / Predio */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" /> Cancha / Lugar
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setCanchaOpcion('busca_cancha')}
                  className={`p-2.5 rounded-xl text-left border transition text-xs ${
                    canchaOpcion === 'busca_cancha'
                      ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold block text-xs">⚽ A medias</span>
                  <span className="text-[10px] text-zinc-500 block">Buscamos cancha juntos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCanchaOpcion('con_cancha')}
                  className={`p-2.5 rounded-xl text-left border transition text-xs ${
                    canchaOpcion === 'con_cancha'
                      ? 'bg-amber-500/10 border-amber-500/60 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold block text-xs">🟢 Ya tenemos</span>
                  <span className="text-[10px] text-zinc-500 block">Ponemos la cancha</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCanchaOpcion('rival_propone')}
                  className={`p-2.5 rounded-xl text-left border transition text-xs ${
                    canchaOpcion === 'rival_propone'
                      ? 'bg-blue-500/10 border-blue-500/60 text-blue-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold block text-xs">🤝 El rival elige</span>
                  <span className="text-[10px] text-zinc-500 block">Jugar de visitante</span>
                </button>
              </div>

              {canchaOpcion === 'con_cancha' && (
                <input
                  type="text"
                  placeholder="Nombre del complejo o cancha (ej. Complejo El Sol)"
                  value={predioNombre}
                  onChange={(e) => setPredioNombre(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-zinc-600 mt-1"
                />
              )}
            </div>

            {/* Ping Táctico Rápido (Chips de 1 toque) */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Ping Táctico Inicial (Sin charla ociosa)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CHIPS_PINGS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setPingSeleccionado(chip);
                      setPingLibre('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition active:scale-95 border ${
                      pingSeleccionado === chip && !pingLibre
                        ? 'bg-amber-500/20 border-amber-500/70 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <input
                type="text"
                maxLength={100}
                placeholder="O escribí un ping breve (máx. 100 caracteres)..."
                value={pingLibre}
                onChange={(e) => setPingLibre(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-zinc-600"
              />
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Botón de Enviar */}
        <div className="mt-5 pt-3 border-t border-zinc-800/80 flex gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="w-1/3 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs transition"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleEnviar}
            disabled={enviando || misEquipos.length === 0}
            className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] active:scale-95 transition disabled:opacity-50 cursor-pointer"
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Lanzar Desafío
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
