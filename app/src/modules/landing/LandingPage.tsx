import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MapPin, 
  Trophy, 
  ArrowRight, 
  ArrowUp,
  Sparkles, 
  ChevronRight, 
  Building2, 
  Flame, 
  HelpCircle,
  Menu,
  X
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mostrarScrollTop, setMostrarScrollTop] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setMostrarScrollTop(true);
      } else {
        setMostrarScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMenuMovilAbierto(false);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80; // Offset para la barra fija
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full min-h-screen bg-[#0B0F19] text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black scroll-smooth relative">
      {/* 1. Header / Barra Superior Fija */}
      <header className="sticky top-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md border-b border-zinc-800/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <button 
            type="button" 
            onClick={scrollToTop} 
            className="flex items-center gap-2.5 cursor-pointer text-left focus:outline-none"
          >
            <img 
              src="/logo-fulbeand-completo.svg?v=20261109" 
              alt="Fulbeando" 
              className="h-9 sm:h-12 w-auto object-contain" 
            />
          </button>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
            <button
              type="button"
              onClick={() => scrollToSection('como-funciona')}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              ¿Cómo Funciona?
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('beneficios')}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              Jugadores
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('predios')}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              Dueños de Predios
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              Preguntas Frecuentes
            </button>
          </nav>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-zinc-200 hover:text-white transition"
            >
              Ingresar
            </Link>
            <Link
              to="/login"
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Registrarme</span>
              <ChevronRight className="w-4 h-4 hidden sm:inline" />
            </Link>

            {/* Botón Menú Móvil */}
            <button
              type="button"
              onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
              aria-label="Abrir menú de navegación"
              className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer"
            >
              {menuMovilAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menú desplegable Móvil */}
        <AnimatePresence>
          {menuMovilAbierto && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-zinc-950 border-b border-zinc-800 px-4 py-4 space-y-3"
            >
              <button
                type="button"
                onClick={() => scrollToSection('como-funciona')}
                className="block w-full text-left py-2 text-sm font-semibold text-zinc-300 hover:text-emerald-400"
              >
                ¿Cómo Funciona?
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('beneficios')}
                className="block w-full text-left py-2 text-sm font-semibold text-zinc-300 hover:text-emerald-400"
              >
                Jugadores y Equipos
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('predios')}
                className="block w-full text-left py-2 text-sm font-semibold text-zinc-300 hover:text-emerald-400"
              >
                Complejos y Predios
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('faq')}
                className="block w-full text-left py-2 text-sm font-semibold text-zinc-300 hover:text-emerald-400"
              >
                Preguntas Frecuentes
              </button>
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                <Link to="/terminos" className="hover:text-white">Términos</Link>
                <span>•</span>
                <Link to="/privacidad" className="hover:text-white">Privacidad</Link>
                <span>•</span>
                <Link to="/contacto" className="hover:text-white">Contacto</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-10 pb-16 sm:pt-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Luces y resplandores de fondo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-bold tracking-wide">
            <Sparkles className="w-4 h-4" />
            <span>La red futbolera de Argentina</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Encontrá canchas. Armá tu equipo.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Jugá hoy.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-lg text-zinc-400 leading-relaxed font-normal">
            Fulbeando es la plataforma deportiva comunitaria que conecta jugadores, capitanes y complejos de fútbol. Descubrí canchas en tiempo real, sumate a partidos abiertos y llevá el registro de tus estadísticas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-xl shadow-emerald-500/25 transition-all text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Comenzar gratis</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection('como-funciona')}
              className="w-full sm:w-auto px-7 py-4 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold rounded-2xl transition text-base cursor-pointer"
            >
              Conocer cómo funciona
            </button>
          </div>

          {/* Métricas destacadas */}
          <div className="pt-8 sm:pt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">100%</div>
              <div className="text-xs text-zinc-400 font-medium mt-1">Gratis para jugadores</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
              <div className="text-2xl sm:text-3xl font-black text-white">Radar</div>
              <div className="text-xs text-zinc-400 font-medium mt-1">Canchas y predios cercanos</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
              <div className="text-2xl sm:text-3xl font-black text-amber-400">MVP</div>
              <div className="text-xs text-zinc-400 font-medium mt-1">Votación figura del partido</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
              <div className="text-2xl sm:text-3xl font-black text-teal-400">Falta 1</div>
              <div className="text-xs text-zinc-400 font-medium mt-1">Convocatoria relámpago</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sección: ¿Cómo Funciona? */}
      <section id="como-funciona" className="py-16 sm:py-24 bg-zinc-950 border-y border-zinc-800/80 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Paso a paso</div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              ¿Cómo funciona Fulbeando?
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
              Diseñado de futboleros para futboleros. Todo lo que necesitás para que el partido se juegue sí o sí.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-black">
                1
              </div>
              <h3 className="text-lg font-black text-white">Explorá el Radar</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Revisá los complejos deportivos de tu zona con disponibilidad de turnos, fotos de las instalaciones y datos de contacto directo.
              </p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center text-xl font-black">
                2
              </div>
              <h3 className="text-lg font-black text-white">Armá o sumate a un Partido</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Creá tu equipo, lanzá un desafío a otro plantel o publicá una convocatoria si te falta un jugador para completar el partido de fútbol 5, 7 u 11.
              </p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-black">
                3
              </div>
              <h3 className="text-lg font-black text-white">Jugá y Votá la Figura</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Al finalizar el partido, cerrá el marcador en el Tercer Tiempo y votá al jugador MVP. Tu carta de jugador acumula media y prestigio comunitario.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Sección: Funcionalidades para Jugadores */}
      <section id="beneficios" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Para Jugadores y Equipos</div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Todo lo que necesitás en un solo lugar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Radar de Canchas en tiempo real</h3>
                <p className="text-sm text-zinc-400">
                  Encontrá rápidamente qué complejos deportivos tienen turnos libres en tu barrio o ciudad.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Gestión de Equipos y Planteles</h3>
                <p className="text-sm text-zinc-400">
                  Creá tu escudo, asigná capitán, invitá a tus amigos y organizá quién va al arco o a la delantera.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Carta Deportiva Personalizada</h3>
                <p className="text-sm text-zinc-400">
                  Tu carta de jugador con posición, media futbolera, historial de partidos y medallas MVP ganadas.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Muro y Comunidad Futbolera</h3>
                <p className="text-sm text-zinc-400">
                  Compartí fotos, desafíos, celebraciones y conectá con la comunidad de fútbol amateur de tu zona.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Sección: Para Dueños de Predios */}
      <section id="predios" className="py-16 sm:py-24 bg-gradient-to-b from-zinc-950 via-[#130d29] to-zinc-950 border-y border-zinc-800/80 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider border border-indigo-500/20">
            <Building2 className="w-4 h-4" />
            <span>Para Complejos Deportivos</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            ¿Administrás un predio o canchas de fútbol?
          </h2>

          <p className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Sumá tu complejo a Fulbeando para ganar visibilidad entre miles de jugadores locales, llenar los horarios vacíos y coordinar reservas con seña bancaria directa a tu cuenta.
          </p>

          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition"
            >
              <span>Registrar mi Complejo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Sección: Preguntas Frecuentes (FAQ) */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <div className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Dudas Habituales</div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ¿Tiene algún costo registrarse o jugar con Fulbeando?
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                No. Para los jugadores y capitanes, Fulbeando es 100% gratuito. Podés armar tu perfil, crear equipos, buscar partidos y participar de la comunidad sin costo.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ¿Cómo se abona el alquiler de las canchas?
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Fulbeando no es una pasarela de pago ni retiene dinero. Las señas y los pagos se realizan de forma directa y transparente entre el usuario y los datos bancarios oficiales del complejo deportivo elegido.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ¿Qué hago si me falta un jugador para el partido?
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Podés crear una convocatoria de «Falta 1» en el radar de partidos indicando la hora, el predio y la posición que necesitás. Los jugadores de la zona recibirán la alerta y podrán postularse al instante.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ¿Cómo se elige la figura del partido (MVP)?
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Al concluir el partido, en la sección de Tercer Tiempo los participantes habilitados votan de forma anónima al mejor compañero o rival. El jugador con más votos recibe el reconocimiento oficial en su carta deportiva.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer / Pie de página */}
      <footer className="bg-zinc-950 border-t border-zinc-800 pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-2">
              <img 
                src="/logo-fulbeand-completo.svg?v=20261109" 
                alt="Fulbeando" 
                className="h-10 w-auto object-contain" 
              />
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed">
                La red de fútbol amateur de Argentina. Conectamos deportistas, organizadores y complejos para que nunca falte un partido.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-white uppercase tracking-wider">Plataforma</div>
              <ul className="space-y-2 text-xs sm:text-sm text-zinc-400">
                <li><Link to="/login" className="hover:text-emerald-400 transition">Iniciar Sesión</Link></li>
                <li><Link to="/login" className="hover:text-emerald-400 transition">Crear Cuenta</Link></li>
                <li><button type="button" onClick={() => scrollToSection('como-funciona')} className="hover:text-emerald-400 transition cursor-pointer">¿Cómo Funciona?</button></li>
                <li><button type="button" onClick={() => scrollToSection('predios')} className="hover:text-emerald-400 transition cursor-pointer">Complejos Deportivos</button></li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-white uppercase tracking-wider">Legal & Ayuda</div>
              <ul className="space-y-2 text-xs sm:text-sm text-zinc-400">
                <li><Link to="/privacidad" className="hover:text-emerald-400 transition">Política de Privacidad</Link></li>
                <li><Link to="/terminos" className="hover:text-emerald-400 transition">Términos y Condiciones</Link></li>
                <li><Link to="/contacto" className="hover:text-emerald-400 transition">Contacto y Soporte</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <div>© {new Date().getFullYear()} Fulbeando. Todos los derechos reservados.</div>
            <div className="text-center sm:text-right">
              Hecho con pasión por el fútbol amateur 🇦🇷
            </div>
          </div>
        </div>
      </footer>

      {/* Botón flotante para volver arriba */}
      <AnimatePresence>
        {mostrarScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            aria-label="Volver arriba"
            title="Volver arriba"
            className="fixed bottom-6 right-6 z-40 p-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-full shadow-2xl transition cursor-pointer"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
