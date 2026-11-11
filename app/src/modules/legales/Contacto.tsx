import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle2, Shield, MapPin, Home } from 'lucide-react';

export const Contacto: React.FC = () => {
  const navigate = useNavigate();
  const [enviado, setEnviado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleVolver = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !email || !mensaje) return;
    setEnviado(true);
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
              Soporte & Contacto
            </span>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Encabezado */}
        <div className="space-y-3 border-b border-zinc-800 pb-6">
          <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
            <Mail className="w-3.5 h-3.5" />
            Atención a la Comunidad
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Contacto y Soporte
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            ¿Tenés alguna consulta, propuesta o sugerencia para Fulbeando? Escribinos y te responderemos a la brevedad.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Tarjeta de información */}
          <div className="space-y-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Canales Directos
            </h2>
            <div className="space-y-4 text-sm text-zinc-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <Mail className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Correo Electrónico</div>
                  <a href="mailto:contacto@fulbeando.com.ar" className="text-emerald-400 hover:underline">
                    contacto@fulbeando.com.ar
                  </a>
                  <p className="text-xs text-zinc-500 mt-0.5">Consultas generales, legales y prensa.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Sede Operativa</div>
                  <div className="text-zinc-300">Buenos Aires, República Argentina</div>
                  <p className="text-xs text-zinc-500 mt-0.5">Plataforma deportiva digital comunitaria.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Complejos Deportivos</div>
                  <p className="text-zinc-300 text-xs">
                    ¿Tenés un predio de fútbol y querés sumarlo a la red? Escribinos para activar tu complejo en el radar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de contacto */}
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80">
            {enviado ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">¡Mensaje enviado!</h3>
                <p className="text-sm text-zinc-400">
                  Muchas gracias por escribirnos. Nuestro equipo te responderá a tu correo lo antes posible.
                </p>
                <button
                  type="button"
                  onClick={() => { setEnviado(false); setNombre(''); setEmail(''); setMensaje(''); }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-bold text-white">Dejanos tu consulta</h2>

                <div>
                  <label htmlFor="contacto-nombre" className="block text-xs font-bold text-zinc-400 mb-1">Nombre</label>
                  <input
                    id="contacto-nombre"
                    type="text"
                    required
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-400 outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="contacto-email" className="block text-xs font-bold text-zinc-400 mb-1">Correo Electrónico</label>
                  <input
                    id="contacto-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tunombre@correo.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-400 outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="contacto-mensaje" className="block text-xs font-bold text-zinc-400 mb-1">Mensaje</label>
                  <textarea
                    id="contacto-mensaje"
                    required
                    rows={4}
                    value={mensaje}
                    onChange={e => setMensaje(e.target.value)}
                    placeholder="Contanos en qué podemos ayudarte..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-400 outline-none transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Consulta</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Pie de página con botón volver */}
        <footer className="pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>© {new Date().getFullYear()} Fulbeando. Todos los derechos reservados.</div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={handleVolver} className="hover:text-zinc-300 transition cursor-pointer">
              ← Volver
            </button>
            <span>•</span>
            <Link to="/privacidad" className="hover:text-zinc-300 transition">Privacidad</Link>
            <span>•</span>
            <Link to="/terminos" className="hover:text-zinc-300 transition">Términos</Link>
            <span>•</span>
            <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition">Inicio</Link>
          </div>
        </footer>
      </main>
    </div>
  );
};
