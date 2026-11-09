import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, CheckCircle2, FileText, Ban, AlertTriangle, Scale } from 'lucide-react';

interface ModalTerminosProps {
  abierto: boolean;
  onCerrar: () => void;
  onAceptar?: () => void;
}

export const ModalTerminos: React.FC<ModalTerminosProps> = ({
  abierto,
  onCerrar,
  onAceptar,
}) => {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Términos y Condiciones y Normas de Convivencia de Fulbeando"
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white font-sans"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
              📜
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight flex items-center gap-2">
                Términos y Condiciones
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Fulbeando
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Normas de uso, convivencia comunitaria y responsabilidad
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar términos y condiciones"
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {/* Alerta Resumen Destacada */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-amber-200">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Puntos Clave que Debés Conocer</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-xs text-amber-100/90 font-medium">
              <li>Fulbeando es solo un enlace entre jugadores y predios: <strong>no procesamos ni custodiamos dinero</strong>.</li>
              <li>Las señas, pagos y su veracidad son <strong>responsabilidad exclusiva entre vos y el complejo deportivo</strong>.</li>
              <li><strong>Tolerancia cero:</strong> terminantemente prohibida la violencia, contenido sexual o explícito y actividades ilegales.</li>
            </ul>
          </div>

          {/* Cláusula 1: Rol e Intermediación */}
          <div className="space-y-1.5 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
              1. Rol de la Plataforma e Intermediación Deportiva
            </h3>
            <p>
              Fulbeando es una plataforma digital comunitaria cuyo único fin es actuar como enlace informativo y canal de encuentro entre deportistas, organizadores y complejos deportivos. Fulbeando facilita la coordinación de partidos, el armado de equipos y la visualización de turnos disponibles, pero no interviene ni forma parte del contrato civil o comercial celebrado entre los usuarios y los establecimientos.
            </p>
          </div>

          {/* Cláusula 2: Deslinde Financiero */}
          <div className="space-y-2 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              2. Deslinde de Responsabilidad Financiera y Transaccional
            </h3>
            <p className="font-semibold text-white">
              Fulbeando NO es una pasarela de pago, intermediario financiero, billetera virtual ni procesador de cobros.
            </p>
            <p>
              Todos los montos, señas, transferencias bancarias y saldos se celebran <strong>directa y exclusivamente entre el usuario y el complejo deportivo correspondiente</strong>.
            </p>
            <p>Fulbeando no custodia dinero ni se responsabiliza por:</p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li>Transferencias bancarias fallidas, demoradas o realizadas a cuentas equivocadas.</li>
              <li>Cancelaciones, reprogramaciones, suspensiones climáticas o reintegros de señas o alquileres.</li>
              <li>La autenticidad, validez, legitimidad o adulteración de los comprobantes adjuntados por los usuarios.</li>
              <li>La exactitud, veracidad o titularidad de los datos bancarios (CBU, Alias o titular) cargados por los predios deportivos.</li>
            </ul>
            <p className="text-xs text-zinc-400 pt-1">
              Cada parte asume plena responsabilidad por la buena fe, veracidad y verificación de sus operaciones económicas y datos suministrados.
            </p>
          </div>

          {/* Cláusula 3: Normas de Convivencia y Muro Social */}
          <div className="space-y-2 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400 shrink-0" />
              3. Normas de Convivencia y Prohibiciones en el Muro Social
            </h3>
            <p>
              Fulbeando es un espacio para disfrutar del fútbol con respeto. <strong>Queda terminantemente prohibido publicar, comentar, difundir o transmitir en el Muro Social, chats, perfiles o imágenes:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>
                <strong className="text-white">Pornografía y contenido explícito:</strong> Prohibida toda forma de desnudez total o parcial, material pornográfico, servicios de comercio sexual o contenido obsceno y sexualmente explícito.
              </li>
              <li>
                <strong className="text-white">Violencia e intimidación:</strong> Prohibidas las amenazas, incitaciones a la riña, apología de la violencia física, agresiones verbales, discursos de odio o cualquier forma de hostigamiento y acoso.
              </li>
              <li>
                <strong className="text-white">Actividades ilegales y fraude:</strong> Prohibida la promoción de apuestas clandestinas, estafas, venta o consumo de sustancias ilícitas, armas o cualquier conducta tipificada como delito por la legislación aplicable.
              </li>
              <li>
                <strong className="text-white">Discriminación:</strong> Prohibido todo contenido discriminatorio por motivos de raza, nacionalidad, credo, género, orientación sexual o condición física.
              </li>
            </ul>
          </div>

          {/* Cláusula 4: Moderación y Sanciones */}
          <div className="space-y-1.5 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              4. Moderación, Sanciones y Suspensión de Cuentas
            </h3>
            <p>
              Fulbeando se reserva el derecho de supervisar y moderar el contenido de la plataforma. Cualquier infracción a los presentes términos facultará a los administradores a:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li>Eliminar o bloquear de manera inmediata y sin previo aviso publicaciones o comentarios infractores.</li>
              <li>Suspender temporal o definitivamente la cuenta del usuario infractor.</li>
              <li>Poner en conocimiento de las autoridades policiales o judiciales competentes aquellos hechos que pudieran constituir delito.</li>
            </ul>
          </div>
        </div>

        {/* Acciones al pie */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
          {onAceptar && (
            <button
              type="button"
              onClick={() => {
                onAceptar();
                onCerrar();
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
            >
              Acepto los Términos
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
