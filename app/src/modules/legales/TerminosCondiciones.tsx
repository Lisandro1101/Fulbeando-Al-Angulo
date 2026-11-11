import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, ShieldAlert, AlertTriangle, Users, Ban, CheckCircle2, Mail } from 'lucide-react';

export const TerminosCondiciones: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Barra de navegación superior */}
      <header className="sticky top-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-zinc-300 hover:text-emerald-400 font-bold text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Fulbeando</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Marco Legal
            </span>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Encabezado */}
        <div className="space-y-3 border-b border-zinc-800 pb-6">
          <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
            <Scale className="w-3.5 h-3.5" />
            Condiciones del Servicio
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Normas de uso, convivencia comunitaria y responsabilidad en Fulbeando.
          </p>
        </div>

        {/* Resumen Destacado */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-2 text-amber-200">
          <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase tracking-wider">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>Puntos Clave que Debes Conocer</span>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-amber-100/90 font-medium leading-relaxed">
            <li>Fulbeando es un enlace informativo comunitario: <strong>no procesamos, retenemos ni custodiamos dinero</strong>.</li>
            <li>Las señas, pagos y su veracidad son <strong>responsabilidad exclusiva entre vos y el complejo deportivo</strong>.</li>
            <li><strong>Tolerancia cero:</strong> terminantemente prohibida la violencia, discriminación, contenido explícito o actividades fraudulentas.</li>
          </ul>
        </div>

        {/* Cláusula 1 */}
        <section className="space-y-3 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400 shrink-0" />
            1. Rol de la Plataforma e Intermediación Deportiva
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Fulbeando es una plataforma web y comunitaria orientada a conectar deportistas, capitanes de equipo y complejos deportivos en Argentina. La plataforma facilita la visualización de turnos, la creación de desafíos deportivos y la convocatoria de jugadores faltantes, pero no interviene ni forma parte del contrato civil o comercial celebrado entre los usuarios y los establecimientos.
          </p>
        </section>

        {/* Cláusula 2 */}
        <section className="space-y-3 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            2. Deslinde de Responsabilidad Financiera y Transaccional
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed font-semibold text-white">
            Fulbeando NO es una pasarela de pago, intermediario financiero, billetera virtual ni procesador de cobros.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Todos los montos, señas bancarias y saldos se coordinan directa y exclusivamente entre el usuario y el complejo deportivo correspondiente. Fulbeando no custodia dinero ni asume responsabilidad por:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-zinc-300">
            <li>Transferencias bancarias fallidas, demoradas o realizadas a cuentas erróneas.</li>
            <li>Cancelaciones, reprogramaciones o suspensiones climáticas de turnos.</li>
            <li>La autenticidad o legitimidad de los comprobantes adjuntados por los usuarios.</li>
          </ul>
        </section>

        {/* Cláusula 3 */}
        <section className="space-y-3 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400 shrink-0" />
            3. Normas de Convivencia y Conducta Comunitaria
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Para garantizar una experiencia sana y deportiva para todos los miembros, los usuarios se comprometen a:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-zinc-300">
            <li>Mantener un trato respetuoso tanto en el muro comunitario como durante los partidos.</li>
            <li>No compartir contenido violento, discriminatorio, ofensivo o inapropiado.</li>
            <li>Honrar los compromisos de asistencia a los partidos acordados para no perjudicar a los demás jugadores ni al complejo deportivo.</li>
          </ul>
        </section>

        {/* Cláusula 4 */}
        <section className="space-y-3 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-rose-400 shrink-0" />
            4. Suspensión y Cierre de Cuentas
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Fulbeando se reserva el derecho de suspender temporal o definitivamente a cualquier cuenta que infrinja las normas de convivencia, intente vulnerar la plataforma o presente conductas fraudulentas repetidas reportadas por otros miembros o predios deportivos.
          </p>
        </section>

        {/* Cláusula 5 */}
        <section className="space-y-3 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            5. Modificaciones de los Términos
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Podemos actualizar estos Términos periódicamente para reflejar mejoras o cambios en las funciones del servicio. Los cambios entrarán en vigencia tras su publicación en esta página.
          </p>
        </section>

        {/* Pie de página */}
        <footer className="pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>© {new Date().getFullYear()} Fulbeando. Todos los derechos reservados.</div>
          <div className="flex items-center gap-4">
            <Link to="/privacidad" className="hover:text-zinc-300 transition">Política de Privacidad</Link>
            <span>•</span>
            <Link to="/contacto" className="hover:text-zinc-300 transition">Contacto</Link>
            <span>•</span>
            <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition">Inicio</Link>
          </div>
        </footer>
      </main>
    </div>
  );
};
