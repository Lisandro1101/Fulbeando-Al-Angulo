import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Bell, Smartphone, Share2, PlusSquare, AlertCircle, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useSesion } from '@/modules/auth/useSesion';
import { obtenerEstadoNotificaciones, requestNotificationPermission } from '@/modules/notifications/pushService';

/**
 * Banners flotantes y permanentes para:
 * 1. Instalar la aplicación (PWA) -> Flotante, permanente hasta que se instale.
 * 2. Permiso de notificaciones push -> Flotante, permanente hasta que se conceda el permiso.
 */
export const BannersPersistentes: React.FC = () => {
  const { debeInstalar, isIOS, promptInstall, isInstalled } = useInstallPrompt();
  const { usuario } = useSesion();

  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() => obtenerEstadoNotificaciones());
  const [solicitandoNotif, setSolicitandoNotif] = useState(false);
  const [mostrarModalIOS, setMostrarModalIOS] = useState(false);
  const [mostrarModalManualAndroid, setMostrarModalManualAndroid] = useState(false);
  const [mostrarAyudaBloqueado, setMostrarAyudaBloqueado] = useState(false);

  // Estados de minimizado (pills flotantes compactas) para no invadir la pantalla
  const [minimizadaInstalar, setMinimizadaInstalar] = useState(false);
  const [minimizadaNotif, setMinimizadaNotif] = useState(false);

  // Monitorear estado de permisos de notificación en tiempo real
  useEffect(() => {
    const estado = obtenerEstadoNotificaciones();
    setNotifPerm(estado);

    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((status) => {
          status.onchange = () => {
            setNotifPerm(obtenerEstadoNotificaciones());
          };
        })
        .catch(() => {});
    }
  }, []);

  const handleInstalar = async () => {
    const res = await promptInstall();
    if (res === 'manual_instructions') {
      if (isIOS) {
        setMostrarModalIOS(true);
      } else {
        setMostrarModalManualAndroid(true);
      }
    }
  };

  const handleActivarNotificaciones = async () => {
    if (notifPerm === 'denied') {
      setMostrarAyudaBloqueado(true);
      return;
    }

    setSolicitandoNotif(true);
    try {
      const res = await requestNotificationPermission(usuario?.uid);
      setNotifPerm(res);
      if (res === 'denied') {
        setMostrarAyudaBloqueado(true);
      }
    } finally {
      setSolicitandoNotif(false);
    }
  };

  // ¿Debe mostrarse el cartel de instalación? (Desactivado momentáneamente)
  // const mostrarCartelInstalar = debeInstalar && !isInstalled;
  const mostrarCartelInstalar = false;

  // ¿Debe mostrarse el cartel de notificaciones?
  const mostrarCartelNotificaciones = notifPerm !== 'unsupported' && notifPerm !== 'granted';

  // Si no hay nada pendiente, no renderiza nada
  if (!mostrarCartelInstalar && !mostrarCartelNotificaciones) {
    return null;
  }

  return (
    <div className="fixed top-20 md:top-6 left-3 right-3 md:left-auto md:right-6 md:w-[420px] z-[85] flex flex-col gap-2.5 pointer-events-none">
      <AnimatePresence>
        {/* =========================================================
            CARTEL FLOTANTE PERMANENTE: INSTALAR APLICACIÓN (DESACTIVADO MOMENTÁNEAMENTE)
            ========================================================= */}
        {/* {mostrarCartelInstalar && (
          <motion.div
            key="banner-instalar"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="pointer-events-auto w-full bg-[#1b0a3c]/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-black/70 flex flex-col gap-2.5 text-white"
          >
            {minimizadaInstalar ? (
              // Versión píldora compacta
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setMinimizadaInstalar(false)}
                  className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 animate-pulse text-emerald-400" />
                  <span>Instalar App Al Ángulo</span>
                </button>
                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={handleInstalar}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-3 py-1.5 rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-500/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Instalar</span>
                  </motion.button>
                  <button
                    onClick={() => setMinimizadaInstalar(false)}
                    title="Expandir aviso"
                    className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              // Versión completa flotante
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-inner">
                      <Smartphone className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-black text-white tracking-wide">
                          Instalá Al Ángulo en tu celular
                        </h4>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                          App Oficial
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-zinc-300 mt-0.5 leading-snug">
                        Accedé más rápido a tu carta, partidos y canchas a pantalla completa.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setMinimizadaInstalar(true)}
                    title="Minimizar aviso"
                    className="text-zinc-400 hover:text-white p-1 shrink-0 cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                  <motion.button
                    type="button"
                    onClick={handleInstalar}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/30 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar Aplicación</span>
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )} */}

        {/* =========================================================
            CARTEL FLOTANTE PERMANENTE: PERMISO DE NOTIFICACIONES
            ========================================================= */}
        {mostrarCartelNotificaciones && (
          <motion.div
            key="banner-notificaciones"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className={`pointer-events-auto w-full bg-[#200b44]/95 backdrop-blur-xl border rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-black/70 flex flex-col gap-2.5 text-white ${
              notifPerm === 'denied' ? 'border-amber-500/60' : 'border-amber-400/50'
            }`}
          >
            {minimizadaNotif ? (
              // Versión píldora compacta
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setMinimizadaNotif(false)}
                  className="flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Notificaciones de partidos</span>
                </button>
                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={handleActivarNotificaciones}
                    disabled={solicitandoNotif}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black px-3 py-1.5 rounded-xl text-xs cursor-pointer shadow-md shadow-amber-400/30 disabled:opacity-50"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{solicitandoNotif ? '...' : notifPerm === 'denied' ? 'Habilitar' : 'Activar'}</span>
                  </motion.button>
                  <button
                    onClick={() => setMinimizadaNotif(false)}
                    title="Expandir aviso"
                    className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              // Versión completa flotante
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
                      <Bell className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-black text-white tracking-wide">
                          {notifPerm === 'denied'
                            ? 'Notificaciones bloqueadas en navegador'
                            : 'Activá las notificaciones de partidos'}
                        </h4>
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                          Alertas Push
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-zinc-300 mt-0.5 leading-snug">
                        {notifPerm === 'denied'
                          ? 'Tocá acá para ver cómo habilitarlas en el candado de tu navegador.'
                          : 'Enterate cuando te desafíen, confirmen tu reserva o falte un jugador.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setMinimizadaNotif(true)}
                    title="Minimizar aviso"
                    className="text-zinc-400 hover:text-white p-1 shrink-0 cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                  <motion.button
                    type="button"
                    onClick={handleActivarNotificaciones}
                    disabled={solicitandoNotif}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 font-black px-4 py-2 rounded-xl text-xs shadow-md cursor-pointer transition disabled:opacity-50 ${
                      notifPerm === 'denied'
                        ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/30'
                        : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-amber-400/30'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span>
                      {solicitandoNotif
                        ? 'Activando...'
                        : notifPerm === 'denied'
                        ? 'Cómo habilitar en navegador'
                        : 'Activar Notificaciones'}
                    </span>
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          MODAL: INSTRUCCIONES DE INSTALACIÓN EN IPHONE (iOS) (DESACTIVADO MOMENTÁNEAMENTE)
          ========================================================= */}
      {/* {mostrarModalIOS && (
        <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1b0a3c] border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl relative"
          >
            <button
              onClick={() => setMostrarModalIOS(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-black text-lg">Instalá Al Ángulo en tu iPhone</h3>
              <p className="text-xs text-zinc-300 mt-1">Seguí estos 3 simples pasos en Safari:</p>
            </div>
            <div className="space-y-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-200">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  1
                </span>
                <span>
                  Tocá el botón <strong>Compartir</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-emerald-400" /> en la barra inferior de Safari.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  2
                </span>
                <span>
                  Buscá y seleccioná <strong>Agregar a pantalla de inicio</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-400" />.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  3
                </span>
                <span>
                  Tocá <strong>Agregar</strong> arriba a la derecha. ¡Y listo! Abrila como una app.
                </span>
              </div>
            </div>
            <button
              onClick={() => setMostrarModalIOS(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3 rounded-xl text-xs cursor-pointer shadow-md"
            >
              Entendido
            </button>
          </motion.div>
        </div>
      )} */}

      {/* =========================================================
          MODAL: INSTRUCCIONES MANUALES DE INSTALACIÓN EN ANDROID / PC (DESACTIVADO MOMENTÁNEAMENTE)
          ========================================================= */}
      {/* {mostrarModalManualAndroid && (
        <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1b0a3c] border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl relative"
          >
            <button
              onClick={() => setMostrarModalManualAndroid(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Download className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-black text-lg">Instalá Al Ángulo</h3>
              <p className="text-xs text-zinc-300 mt-1">Podés instalarla desde el menú de tu navegador:</p>
            </div>
            <div className="space-y-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-200">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  1
                </span>
                <span>
                  Abrí el menú de <strong>tres puntos ⋮</strong> arriba a la derecha en Chrome o tu navegador.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  2
                </span>
                <span>
                  Elegí <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  3
                </span>
                <span>
                  Confirmá y la app quedará instalada en tu dispositivo.
                </span>
              </div>
            </div>
            <button
              onClick={() => setMostrarModalManualAndroid(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3 rounded-xl text-xs cursor-pointer shadow-md"
            >
              Cerrar
            </button>
          </motion.div>
        </div>
      )} */}

      {/* =========================================================
          MODAL: AYUDA SI LAS NOTIFICACIONES ESTÁN BLOQUEADAS
          ========================================================= */}
      {mostrarAyudaBloqueado && (
        <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#210c42] border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl relative"
          >
            <button
              onClick={() => setMostrarAyudaBloqueado(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-black text-lg">Habilitar Notificaciones</h3>
              <p className="text-xs text-zinc-300 mt-1">El navegador tiene las alertas bloqueadas. Para activarlas:</p>
            </div>
            <div className="space-y-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-200">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  1
                </span>
                <span>
                  Hacé clic en el <strong>ícono de candado 🔒 o ajustes</strong> en la barra de direcciones de tu navegador.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  2
                </span>
                <span>
                  Buscá <strong>Notificaciones</strong> o <strong>Permisos</strong> y cambialo a <strong>Permitir</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  3
                </span>
                <span>
                  Recargá la página para empezar a recibir alertas en tiempo real.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setMostrarAyudaBloqueado(false);
                setNotifPerm(obtenerEstadoNotificaciones());
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-3 rounded-xl text-xs cursor-pointer shadow-md"
            >
              Entendido
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
