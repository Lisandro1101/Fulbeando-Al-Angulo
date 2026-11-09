import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bug,
  Lightbulb,
  MessageSquare,
  Send,
  CheckCircle2,
  Loader2,
  HelpCircle,
  Search,
  ChevronDown,
  Shield,
  Users,
  Calendar,
  Settings,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useSesion } from '@/modules/auth/useSesion';
import { enviarFeedback, type TipoFeedback } from './feedbackService';

interface ModalFeedbackProps {
  abierto: boolean;
  onCerrar: () => void;
  tabInicial?: 'faq' | 'reporte';
}

interface PreguntaFrecuente {
  id: string;
  categoria: 'jugadores' | 'equipos' | 'reservas' | 'cuenta';
  categoriaLabel: string;
  pregunta: string;
  respuesta: string;
  destacada?: boolean;
}

const PREGUNTAS_FRECUENTES: PreguntaFrecuente[] = [
  // Jugadores y Partidos
  {
    id: 'radar-partidos',
    categoria: 'jugadores',
    categoriaLabel: 'Jugadores y Partidos',
    pregunta: '¿Cómo encuentro partidos cerca de mi ubicación?',
    respuesta:
      'Andá a la sección **Radar** en el menú. La app detecta automáticamente tu zona o podés moverte en el mapa para descubrir partidos y convocatorias activas a tu alrededor. También podés usar los filtros por modalidad (Fútbol 5, 7, 11), tipo de piso (sintético o césped natural) o si ya cuentan con cancha reservada.',
    destacada: true,
  },
  {
    id: 'sumarse-partido',
    categoria: 'jugadores',
    categoriaLabel: 'Jugadores y Partidos',
    pregunta: '¿Cómo me sumo a un partido que busca jugadores?',
    respuesta:
      'En el **Muro Social** de la Comunidad o en la pestaña **Partidos**, vas a ver publicaciones con solicitudes de jugadores abiertas ("Falta 1 para hoy", "Buscamos arquero"). Hacé clic en la tarjeta del partido para ver los detalles y postulate directamente para que el organizador confirme tu lugar.',
  },
  {
    id: 'mvp-tercer-tiempo',
    categoria: 'jugadores',
    categoriaLabel: 'Jugadores y Partidos',
    pregunta: '¿Cómo funciona el MVP y las calificaciones del Tercer Tiempo?',
    respuesta:
      'Al terminar un partido pactado y confirmarse el resultado, se habilita la fase del **Tercer Tiempo**. Todos los jugadores del encuentro pueden valorar el Fair Play (juego limpio) de sus compañeros y rivales, además de votar a la figura del encuentro (**MVP**). Los reconocimientos se reflejan en tu Ficha de Jugador y aumentan tu reputación deportiva.',
  },

  // Capitanes y Equipos
  {
    id: 'crear-equipo',
    categoria: 'equipos',
    categoriaLabel: 'Capitanes y Equipos',
    pregunta: '¿Cómo creo mi equipo e invito a mis amigos?',
    respuesta:
      'Ingresá a la sección **Equipo** en el menú principal. Si aún no tenés un plantel, tocá en "Crear Equipo", elegí nombre, modalidad base y escudo. Una vez creado, podés compartir el enlace directo de invitación o buscar a tus compañeros por su nombre de usuario para sumarlos al plantel.',
    destacada: true,
  },
  {
    id: 'lanzar-desafio',
    categoria: 'equipos',
    categoriaLabel: 'Capitanes y Equipos',
    pregunta: '¿Cómo lanzo un desafío a otro equipo y pactamos cancha y horario?',
    respuesta:
      'Podés desafiar rivales desde el **Radar** haciendo clic sobre cualquier equipo visible, o publicando un desafío abierto en la pestaña **Partidos**. Cuando el capitán rival acepta tu reto, se abre un **chat táctico de capitanes** dentro de la app para acordar sede, horario y cómo dividir los costos de la cancha.',
  },
  {
    id: 'cancelacion-desafio',
    categoria: 'equipos',
    categoriaLabel: 'Capitanes y Equipos',
    pregunta: '¿Qué pasa si un rival no confirma o cancela el partido?',
    respuesta:
      'Si un equipo no responde al desafío en el plazo establecido o cancela a último momento sin previo aviso, su índice de cumplimiento y reputación se ven penalizados en la plataforma. Tu equipo puede republicar la vacante o desafiar a otro plantel de inmediato.',
  },

  // Reservas y Predios
  {
    id: 'confirmar-reserva-sena',
    categoria: 'reservas',
    categoriaLabel: 'Reservas y Predios',
    pregunta: '¿Cómo se confirma una reserva y el pago de la seña?',
    respuesta:
      'En la sección **Reservas**, seleccioná el complejo deportivo, la cancha y el horario deseado. Para congelar el turno, podés transferir el importe de la seña indicado por el complejo y adjuntar el comprobante bancario en la app. El administrador del predio validará el pago y tu turno quedará 100% confirmado.',
    destacada: true,
  },
  {
    id: 'responsabilidad-pagos-senas',
    categoria: 'reservas',
    categoriaLabel: 'Reservas y Predios',
    pregunta: '¿Fulbeando procesa pagos o se responsabiliza por el dinero de las reservas?',
    respuesta:
      '**Fulbeando no es una pasarela de pago, intermediario financiero ni procesador de cobros.** Nuestra plataforma es simplemente un canal de intermediación comunitaria y enlace informativo entre deportistas y complejos deportivos.\n\nTodos los acuerdos comerciales, señas, transferencias bancarias y saldos se celebran **directa y exclusivamente entre el usuario y el predio deportivo correspondiente**.\n\nFulbeando no custodia dinero ni se responsabiliza por:\n• Transferencias bancarias erróneas, demoradas o fallidas.\n• Cancelaciones, reprogramaciones o reintegros de señas.\n• La veracidad, autenticidad o validez de los comprobantes de pago adjuntados.\n• La exactitud o titularidad de los datos bancarios (CBU/Alias) cargados por los complejos deportivos.\n\nCada parte asume plena responsabilidad por la buena fe, veracidad y verificación de sus transacciones económicas.',
    destacada: true,
  },
  {
    id: 'registrar-predio',
    categoria: 'reservas',
    categoriaLabel: 'Reservas y Predios',
    pregunta: '¿Cómo registro mi complejo o canchas si soy dueño de un predio?',
    respuesta:
      'Si administrás canchas o un complejo deportivo, podés registrar tu predio directamente para acceder al **Panel de Dueño**. Desde allí podrás cargar tus canchas, configurar la grilla horaria semanal, publicar promociones y validar las señas de los turnos en tiempo real.',
  },

  // Cuenta y Seguridad
  {
    id: 'costo-app',
    categoria: 'cuenta',
    categoriaLabel: 'Cuenta y Seguridad',
    pregunta: '¿La app tiene costo para los jugadores?',
    respuesta:
      '**No, Fulbeando es 100% gratuita** para jugadores y capitanes. Podés armar tu perfil deportivo, unirte a planteles, buscar partidos y participar de la comunidad sin ningún costo de suscripción. Únicamente se abona el alquiler de las canchas a los complejos deportivos correspondientes.',
    destacada: true,
  },
  {
    id: 'editar-perfil',
    categoria: 'cuenta',
    categoriaLabel: 'Cuenta y Seguridad',
    pregunta: '¿Cómo edito mi posición, pierna hábil y datos de perfil?',
    respuesta:
      'Entrá a tu **Perfil** desde el menú y seleccioná "Configuración y Ajustes de Perfil" (o ingresá a Ajustes). Vas a poder cambiar tu foto de perfil, apodo, posición preferida en el campo (delantero, mediocampista, defensor, arquero), pierna hábil y zonas de juego preferidas.',
  },
];

type CategoriaFiltro = 'todas' | 'jugadores' | 'equipos' | 'reservas' | 'cuenta';

export const ModalFeedback: React.FC<ModalFeedbackProps> = ({
  abierto,
  onCerrar,
  tabInicial = 'faq',
}) => {
  const { user, usuario } = useSesion();

  // Pestaña activa: 'faq' (Preguntas Frecuentes) o 'reporte' (Enviar Reporte / Sugerencia)
  const [tabActiva, setTabActiva] = useState<'faq' | 'reporte'>(tabInicial);

  // Estados de Preguntas Frecuentes
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaFiltro>('todas');
  const [preguntaAbiertaId, setPreguntaAbiertaId] = useState<string | null>('radar-partidos');

  // Estados del Formulario de Feedback
  const [tipo, setTipo] = useState<TipoFeedback>('sugerencia');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrado reactivo de preguntas
  const preguntasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return PREGUNTAS_FRECUENTES.filter((p) => {
      if (categoriaFiltro !== 'todas' && p.categoria !== categoriaFiltro) return false;
      if (!q) return true;
      return (
        p.pregunta.toLowerCase().includes(q) ||
        p.respuesta.toLowerCase().includes(q) ||
        p.categoriaLabel.toLowerCase().includes(q)
      );
    });
  }, [busqueda, categoriaFiltro]);

  if (!abierto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim() || enviando) return;
    if (!user) {
      setError('Tenés que haber iniciado sesión para enviar tu reporte.');
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await enviarFeedback({
        usuarioUid: user.uid,
        usuarioNombre: usuario?.nombre || user.displayName || user.email || 'Usuario',
        usuarioEmail: user.email || null,
        usuarioRol: usuario?.rol || 'jugador',
        tipo,
        mensaje: mensaje.trim(),
        ruta: typeof window !== 'undefined' ? window.location.pathname : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });

      setEnviado(true);
      setTimeout(() => {
        setEnviado(false);
        setMensaje('');
        onCerrar();
      }, 2500);
    } catch (err: any) {
      console.error('Error enviando feedback:', err);
      setError('No se pudo enviar el mensaje. Por favor intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const togglePregunta = (id: string) => {
    setPreguntaAbiertaId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Centro de Ayuda y Preguntas Frecuentes"
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Encabezado Principal */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
              ⚽
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight flex items-center gap-2">
                Centro de Ayuda
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Fulbeando
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Respuestas rápidas, guías de juego y soporte técnico
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar Centro de Ayuda"
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas: FAQ vs Reportar */}
        <div className="flex items-center bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-1 gap-1 mb-4 shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => setTabActiva('faq')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tabActiva === 'faq'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Preguntas Frecuentes</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('reporte')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tabActiva === 'reporte'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Enviar Reporte o Sugerencia</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* PESTAÑA 1: PREGUNTAS FRECUENTES (FAQ)                           */}
        {/* ============================================================== */}
        {tabActiva === 'faq' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-3">
            {/* Buscador de Preguntas */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por palabra clave (ej: radar, seña, equipo, mvp...)"
                className="w-full bg-zinc-950/90 border border-zinc-800 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/40 transition"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Chips de Categorías */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar text-xs">
              {[
                { id: 'todas', label: 'Todas' },
                { id: 'jugadores', label: '🏃 Jugadores' },
                { id: 'equipos', label: '🛡️ Equipos' },
                { id: 'reservas', label: '🏟️ Reservas' },
                { id: 'cuenta', label: '⚙️ Cuenta' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaFiltro(cat.id as CategoriaFiltro)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    categoriaFiltro === cat.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-white border border-transparent hover:border-zinc-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Lista Acordeón de Preguntas */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {preguntasFiltradas.length === 0 ? (
                <div className="py-10 px-4 text-center space-y-3 bg-zinc-950/40 rounded-2xl border border-zinc-800/60">
                  <p className="text-sm font-bold text-zinc-300">
                    No encontramos preguntas que coincidan con &quot;{busqueda}&quot;
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    ¿Tenés alguna duda específica o problema técnico que no figure acá?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTabActiva('reporte');
                      setTipo('general');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs transition hover:bg-amber-400 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Escribinos tu consulta</span>
                  </button>
                </div>
              ) : (
                preguntasFiltradas.map((item) => {
                  const estaAbierta = preguntaAbiertaId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        estaAbierta
                          ? 'bg-zinc-950/90 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                          : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => togglePregunta(item.id)}
                        className="w-full p-3.5 sm:p-4 text-left flex items-start justify-between gap-3 cursor-pointer group"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            {item.categoriaLabel}
                            {item.destacada && (
                              <span className="text-amber-400 font-bold">★ Frecuente</span>
                            )}
                          </span>
                          <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                            {item.pregunta}
                          </h3>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-zinc-400 shrink-0 mt-1 transition-transform duration-200 ${
                            estaAbierta ? 'rotate-180 text-emerald-400' : 'group-hover:text-white'
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {estaAbierta && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-3.5 sm:px-4 pb-4 pt-1 text-xs text-zinc-300 font-medium leading-relaxed border-t border-zinc-800/50"
                          >
                            <div
                              dangerouslySetInnerHTML={{
                                __html: item.respuesta
                                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black">$1</strong>'),
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}

              {/* Banner inferior para invitar a reportar si no encontró respuesta */}
              <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#281165]/60 to-[#361982]/60 border border-[#4c24b2]/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-black text-white">
                    ¿No encontraste lo que buscabas o encontraste un error?
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Dejanos tu sugerencia o informe y nuestro equipo te responderá.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTabActiva('reporte')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md transition active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Enviar reporte</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: ENVIAR REPORTE O SUGERENCIA                          */}
        {/* ============================================================== */}
        {tabActiva === 'reporte' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {enviado ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-center justify-center text-center space-y-3"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-white">¡Gracias por tu aporte! ⚽</h3>
                  <p className="text-xs text-zinc-400 max-w-xs font-medium">
                    Recibimos tu mensaje correctamente. Nuestro equipo lo revisará para seguir mejorando la app.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {/* Selector de Tipo de Feedback */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
                      ¿Qué querés enviarnos?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTipo('sugerencia')}
                        className={`p-3 rounded-2xl border text-left flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          tipo === 'sugerencia'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        <span className="text-xs font-black text-center">Sugerencia</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTipo('bug')}
                        className={`p-3 rounded-2xl border text-left flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          tipo === 'bug'
                            ? 'bg-rose-500/15 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <Bug className="w-5 h-5 text-rose-400" />
                        <span className="text-xs font-black text-center">Reportar Error</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTipo('general')}
                        className={`p-3 rounded-2xl border text-left flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          tipo === 'general'
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <MessageSquare className="w-5 h-5 text-emerald-400" />
                        <span className="text-xs font-black text-center">Consulta u Opinión</span>
                      </button>
                    </div>
                  </div>

                  {/* Mensaje / Descripción */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="mensaje-feedback" className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                        {tipo === 'bug'
                          ? 'Describí el problema'
                          : tipo === 'sugerencia'
                          ? 'Contanos tu propuesta'
                          : 'Escribí tu mensaje'}
                      </label>
                      <span className="text-[10px] text-zinc-500 font-bold">
                        {mensaje.length}/500
                      </span>
                    </div>
                    <textarea
                      id="mensaje-feedback"
                      value={mensaje}
                      maxLength={500}
                      onChange={(e) => setMensaje(e.target.value)}
                      placeholder={
                        tipo === 'bug'
                          ? '¿Qué estabas haciendo cuando falló? Si algún botón no respondió o una tarjeta se vio corrida, contanos...'
                          : tipo === 'sugerencia'
                          ? '¿Qué funcionalidad te gustaría que sumemos o qué mejorarías en la app?'
                          : 'Dejanos tus comentarios o dudas sobre la plataforma...'
                      }
                      rows={4}
                      required
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 resize-none transition"
                    />
                  </div>

                  {/* Indicador contextual de pantalla */}
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-3 py-2 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Pantalla actual:</span>
                    </span>
                    <span className="font-mono font-bold text-zinc-300">
                      {typeof window !== 'undefined' ? window.location.pathname : '/'}
                    </span>
                  </div>

                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium">
                      {error}
                    </div>
                  )}

                  {/* Botón de envío */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!mensaje.trim() || enviando}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition active:scale-95 text-xs sm:text-sm uppercase tracking-wider"
                    >
                      {enviando ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando reporte...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Enviar Mensaje</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};
