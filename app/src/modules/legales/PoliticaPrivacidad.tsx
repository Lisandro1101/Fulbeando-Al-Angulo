import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Cookie, HelpCircle, Mail, Home } from 'lucide-react';

export const PoliticaPrivacidad: React.FC = () => {
  const navigate = useNavigate();

  const handleVolver = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black scroll-smooth">
      {/* Barra de navegación superior */}
      <header className="sticky top-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleVolver}
              className="flex items-center gap-2 text-zinc-300 hover:text-emerald-400 font-bold text-sm transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver atrás</span>
            </button>
            <span className="text-zinc-600">|</span>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-semibold transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Legal & Privacidad
            </span>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Encabezado */}
        <div className="space-y-3 border-b border-zinc-800 pb-6">
          <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
            <Shield className="w-3.5 h-3.5" />
            Compromiso de Privacidad
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Política de Privacidad
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Última actualización: 11 de noviembre de 2026. Tu privacidad y la transparencia sobre cómo usamos tus datos son fundamentales para Fulbeando.
          </p>
        </div>

        {/* Sección 1: Introducción */}
        <section className="space-y-3 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-400" />
            1. Información General y Responsable del Tratamiento
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Fulbeando (<a href="https://fulbeando.com.ar" className="text-emerald-400 underline">fulbeando.com.ar</a>) es una plataforma comunitaria diseñada para conectar jugadores de fútbol, facilitar el armado de equipos y coordinar turnos con complejos deportivos en Argentina. La presente Política de Privacidad describe qué información recopilamos, cómo la utilizamos y las opciones que tienes respecto a tus datos personales.
          </p>
        </section>

        {/* Sección 2: Información que recopilamos */}
        <section className="space-y-3 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            2. Datos que Recopilamos
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-relaxed">
            <li>
              <strong>Datos de Cuenta y Perfil:</strong> Al registrarte mediante correo electrónico o autenticación de Google, recopilamos tu nombre, apellido, correo electrónico y foto de perfil para identificar tu cuenta y permitir tu participación en equipos y partidos.
            </li>
            <li>
              <strong>Ubicación Geográfica:</strong> Solicitamos acceso a tu geolocalización aproximada únicamente para mostrarte canchas, complejos y partidos cercanos a tu radio geográfico. La ubicación no se vende ni se comparte con fines comerciales ajenos a la plataforma.
            </li>
            <li>
              <strong>Actividad deportiva comunitaria:</strong> Datos públicos relacionados con tu perfil deportivo (posición, estadísticas de partidos, equipos de los que formas parte y votos de MVP de partidos finalizados).
            </li>
          </ul>
        </section>

        {/* Sección 3: Publicidad de Terceros y Google AdSense */}
        <section className="space-y-4 bg-emerald-950/20 p-6 rounded-2xl border border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Cookie className="w-4 h-4" />
            <span>Cláusula Especial de Publicidad y Cookies</span>
          </div>
          <h2 className="text-lg font-bold text-white">
            3. Google AdSense y Cookies de Terceros
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            En Fulbeando utilizamos proveedores de publicidad externos, incluyendo <strong>Google AdSense</strong>, para publicar anuncios cuando visitas nuestro sitio web:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-relaxed">
            <li>
              <strong>Proveedores externos, incluido Google,</strong> utilizan cookies para publicar anuncios basados en las visitas anteriores de un usuario a este sitio web o a otros sitios de Internet.
            </li>
            <li>
              El uso de cookies de publicidad por parte de Google y sus socios les permite personalizar los anuncios que se te muestran en función de tus visitas a nuestros sitios web o a otros portales de la red.
            </li>
            <li>
              <strong>Inhabilitación de publicidad personalizada:</strong> Puedes inhabilitar la publicidad personalizada de Google en cualquier momento ingresando a la <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-semibold underline">Configuración de Anuncios de Google</a>.
            </li>
            <li>
              Adicionalmente, puedes inhabilitar el uso de cookies para publicidad personalizada de proveedores externos visitando la iniciativa reguladora <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-semibold underline">www.aboutads.info</a> o la plataforma de autorregulación europea <a href="https://www.youronlinechoices.eu" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-semibold underline">Your Online Choices</a>.
            </li>
          </ul>
        </section>

        {/* Sección 4: Deslinde Financiero */}
        <section className="space-y-3 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            4. Transacciones y Pagos Directos
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Fulbeando <strong>NO almacena números de tarjetas de crédito, claves bancarias ni procesa cobros monetarios</strong>. Cualquier seña o transferencia bancaria coordinada para la reserva de canchas se realiza de forma directa y exclusiva entre el usuario y el complejo deportivo correspondiente.
          </p>
        </section>

        {/* Sección 5: Derechos de los usuarios */}
        <section className="space-y-3 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            5. Derechos de Acceso, Rectificación y Supresión
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            De acuerdo con la Ley de Protección de Datos Personales N° 25.326 de la República Argentina, tienes derecho a acceder a tus datos personales, rectificarlos o solicitar su eliminación en cualquier momento desde tu panel de usuario o comunicándote con nosotros.
          </p>
        </section>

        {/* Sección 6: Contacto */}
        <section className="space-y-3 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-400" />
            6. Contacto
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Si tienes dudas o inquietudes sobre esta Política de Privacidad o el tratamiento de tus datos, puedes contactarnos a través de nuestra sección de <Link to="/contacto" className="text-emerald-400 underline font-semibold">Contacto</Link> o escribiéndonos a <strong className="text-white">contacto@fulbeando.com.ar</strong>.
          </p>
        </section>

        {/* Pie de página con botón volver */}
        <footer className="pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>© {new Date().getFullYear()} Fulbeando. Todos los derechos reservados.</div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={handleVolver} className="hover:text-zinc-300 transition cursor-pointer">
              ← Volver
            </button>
            <span>•</span>
            <Link to="/terminos" className="hover:text-zinc-300 transition">Términos</Link>
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
