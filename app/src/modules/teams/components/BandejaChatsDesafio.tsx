import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Shield,
  Clock,
  MapPin,
  ChevronRight,
  Swords,
  Trophy,
  ArrowRight,
  Radio,
} from 'lucide-react';
import type { InvitacionEquipo } from '@/modules/teams/teamService';
import { useNavigate } from 'react-router-dom';

interface BandejaChatsDesafioProps {
  abierto: boolean;
  onCerrar: () => void;
  usuarioUid: string;
  desafios: InvitacionEquipo[];
  onAbrirChat: (desafio: InvitacionEquipo) => void;
}

export const BandejaChatsDesafio: React.FC<BandejaChatsDesafioProps> = ({
  abierto,
  onCerrar,
  usuarioUid,
  desafios,
  onAbrirChat,
}) => {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'pactados'>('todos');

  if (!abierto) return null;

  const desafiosFiltrados = desafios.filter((d) => {
    const estado = d.pactoPartido?.estado;
    if (filtro === 'pactados') return estado === 'pactado';
    if (filtro === 'pendientes') return estado === 'propuesto' || estado === 'contraoferta';
    return true;
  });

  return (
    <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0B0F19] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-left my-auto flex flex-col max-h-[88vh] overflow-hidden">
        
        {/* Botón Cerrar */}
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer z-10"
          aria-label="Cerrar bandeja de chats"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-800 pr-10">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Chats de Desafíos
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              Acuerdos tácticos y partidos entre capitanes
            </p>
          </div>
        </div>

        {/* Pestañas de Filtro */}
        <div className="flex gap-2 my-3 pb-1 border-b border-zinc-800/80">
          <button
            type="button"
            onClick={() => setFiltro('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filtro === 'todos'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Todos ({desafios.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltro('pendientes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filtro === 'pendientes'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            En Negociación
          </button>
          <button
            type="button"
            onClick={() => setFiltro('pactados')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filtro === 'pactados'
                ? 'bg-emerald-500 text-zinc-950 font-black shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Pactados ⚽
          </button>
        </div>

        {/* Lista de Conversaciones */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {desafiosFiltrados.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-3 text-2xl">
                🛡️
              </div>
              <h4 className="text-white font-black text-sm mb-1">No hay chats activos</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-5 leading-relaxed">
                Cuando desafíes a un rival desde el Radar o recibas una propuesta de partido, los chats aparecerán acá.
              </p>
              <button
                type="button"
                onClick={() => {
                  onCerrar();
                  navigate('/radar');
                }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-zinc-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md transition active:scale-95 cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                Explorar Equipos en el Radar
              </button>
            </div>
          ) : (
            desafiosFiltrados.map((desafio) => {
              const pacto = desafio.pactoPartido;
              const soyDesafiante = desafio.remitenteUid === usuarioUid;

              const rivalNombre = soyDesafiante
                ? pacto?.equipoRivalNombre || desafio.destinatarioNombre || 'Equipo Rival'
                : desafio.equipoNombre || 'Equipo Desafiante';

              const rivalEscudo = soyDesafiante
                ? pacto?.equipoRivalEscudoUrl || null
                : desafio.equipoEscudoUrl || null;

              const pings = pacto?.pingsTacticos || [];
              const ultimoPing = pings[pings.length - 1];
              const esNoLeido = !desafio.leida && desafio.destinatarioUid === usuarioUid;
              const yaPactado = pacto?.estado === 'pactado';

              const textoSnippet = ultimoPing
                ? `${ultimoPing.emisorUid === usuarioUid ? 'Vos: ' : ''}${ultimoPing.texto}`
                : desafio.mensaje || 'Propuesta de partido enviada';

              return (
                <div
                  key={desafio.id}
                  onClick={() => onAbrirChat(desafio)}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    esNoLeido
                      ? 'bg-zinc-900/90 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/90 hover:border-zinc-700'
                  }`}
                >
                  {/* Punto pulsante de mensaje no leído */}
                  {esNoLeido && (
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  )}

                  {/* Escudo del Rival */}
                  <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:border-amber-500/60 transition">
                    {rivalEscudo ? (
                      <img src={rivalEscudo} alt={rivalNombre} className="w-full h-full object-cover" />
                    ) : (
                      <Shield className="w-6 h-6 text-amber-500" />
                    )}
                  </div>

                  {/* Información Principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 mb-1 pr-4">
                      <h4 className="text-white font-black text-sm truncate">{rivalNombre}</h4>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                          yaPactado
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : pacto?.estado === 'contraoferta'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {yaPactado ? 'Pactado ⚽' : pacto?.estado === 'contraoferta' ? 'Contraoferta' : 'En Acuerdo'}
                      </span>
                    </div>

                    {/* Términos rápidos: Modalidad / Día */}
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-1">
                      <span className="font-black text-amber-400">{pacto?.modalidad || 'F5'}</span>
                      <span>•</span>
                      <span className="truncate">{pacto?.fechaTentativa || 'Día a acordar'}</span>
                    </div>

                    {/* Último ping / mensaje */}
                    <p className="text-xs text-zinc-300 truncate font-medium flex items-center gap-1">
                      <span className="truncate">{textoSnippet}</span>
                    </p>
                  </div>

                  {/* Flecha derecha */}
                  <div className="text-zinc-500 group-hover:text-amber-400 transition shrink-0">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
