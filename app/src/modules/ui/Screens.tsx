import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building, Share2, UploadCloud, MapPinned, Users, CheckCircle, Search, Calendar, ChevronRight } from 'lucide-react';

// ==========================================
// PANTALLA 1: Login / Registro Unificado
// ==========================================
export const Screen1Login = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-6 text-white font-sans">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black italic tracking-tighter">AL ÁNGULO</h1>
          <p className="text-emerald-500 font-bold uppercase tracking-widest text-xs mt-2">El Potrero Digital</p>
        </div>
        
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); navigate('/role-selector'); }}>
          <input type="email" placeholder="Email" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" />
          <input type="password" placeholder="Contraseña" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" />
          
          <button type="submit" className="w-full bg-emerald-500 text-zinc-950 font-black py-3 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition">
            INGRESAR
          </button>
        </form>
        
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs font-semibold">O</span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        <button onClick={() => navigate('/role-selector')} className="w-full bg-white text-zinc-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
          Continuar con Google
        </button>
      </div>
    </div>
  );
};

// ==========================================
// PANTALLA 2: Selector de Rol
// ==========================================
export const Screen2RoleSelector = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex flex-col justify-center font-sans">
      <h2 className="text-2xl font-black text-white text-center mb-8">¿Cómo vas a jugar hoy?</h2>
      
      <div className="space-y-4">
        {/* Card Jugador */}
        <button onClick={() => navigate('/onboarding-player')} className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-start gap-4 hover:border-emerald-500 transition group text-left">
          <div className="bg-zinc-800 p-3 rounded-full text-blue-500 group-hover:bg-blue-500 group-hover:text-zinc-950 transition">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Soy Jugador</h3>
            <p className="text-sm text-zinc-400 mt-1">Armá tu carta, fichá en equipos y desafiá rivales en tu barrio.</p>
          </div>
        </button>

        {/* Card Dueño */}
        <button onClick={() => navigate('/venue-registration')} className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-start gap-4 hover:border-emerald-500 transition group text-left">
          <div className="bg-zinc-800 p-3 rounded-full text-emerald-500 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Tengo un Complejo</h3>
            <p className="text-sm text-zinc-400 mt-1">Promocioná tus canchas en el radar y recibí partidos.</p>
          </div>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// PANTALLA 3: Onboarding Jugador
// ==========================================
export const Screen3PlayerOnboarding = () => {
  const navigate = useNavigate();
  const [pos, setPos] = useState('DEL');

  const [formData, setFormData] = useState({
    nombre: 'Lionel Andrés', 
    apellido: 'Messi',      
    telefono: '',
    fechaNacimiento: '',
    apodo: 'Lio'
  });

  // --- ZONAS Y LOCALIDADES PARA ESCALAR ---
  const ZONAS_OPERATIVAS: Record<string, string[]> = {
    "GBA Zona Sur": [
      'Alejandro Korn', 'Adrogué', 'Avellaneda', 'Banfield', 'Burzaco', 
      'Canning', 'Ezeiza', 'Glew', 'Guernica', 'Lanús', 'Llavallol', 
      'Lomas de Zamora', 'Longchamps', 'Luis Guillón', 'Monte Grande', 
      'San Vicente', 'Temperley'
    ],
    "CABA (Próximamente)": [
      'Caballito', 'Palermo', 'Villa Crespo'
    ],
    "GBA Oeste (Próximamente)": [
      'Ramos Mejía', 'Morón', 'Castelar'
    ]
  };

  const [zonaSeleccionada, setZonaSeleccionada] = useState("GBA Zona Sur");
  const [localidadQuery, setLocalidadQuery] = useState('');
  const [localidadElegida, setLocalidadElegida] = useState('Guernica');
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  // Filtrado reactivo de localidades según zona y texto ingresado
  const localidadesDisponibles = ZONAS_OPERATIVAS[zonaSeleccionada] || [];
  const localidadesFiltradas = localidadesDisponibles.filter(loc => 
    loc.toLowerCase().includes(localidadQuery.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex flex-col font-sans text-white pb-safe">
      <h2 className="text-2xl font-black mt-8">Creá tu Carta de Jugador</h2>
      <p className="text-zinc-400 text-sm mt-2 mb-8">Revisá y completá tus datos base. Arrancás con Media 50%.</p>

      <div className="space-y-6 flex-1">
        
        {/* DATOS PERSONALES */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Nombre</label>
            <input name="nombre" value={formData.nombre} onChange={handleChange} type="text" className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-base text-zinc-300" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Apellido</label>
            <input name="apellido" value={formData.apellido} onChange={handleChange} type="text" className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-base text-zinc-300" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase">Número de Teléfono</label>
          <input name="telefono" value={formData.telefono} onChange={handleChange} type="tel" placeholder="+54 11 1234-5678" className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-lg" />
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase">Fecha de Nacimiento</label>
          <input name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} type="date" className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-lg text-white" />
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase">Apodo Futbolero (En la Carta)</label>
          <input name="apodo" value={formData.apodo} onChange={handleChange} type="text" placeholder="Ej: El Rústico" className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-lg text-amber-500" />
        </div>
        
        {/* SELECTOR ZONA + BUSCADOR DE LOCALIDADES */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Región</label>
            <select 
              value={zonaSeleccionada}
              onChange={(e) => { 
                setZonaSeleccionada(e.target.value); 
                setLocalidadElegida(''); // Resetear localidad al cambiar de zona
              }}
              className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-sm text-white appearance-none"
            >
              {Object.keys(ZONAS_OPERATIVAS).map(zona => (
                <option key={zona} value={zona} className="bg-zinc-900">{zona}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="text-xs font-bold text-zinc-500 uppercase">Barrio / Localidad</label>
            <div 
              className="w-full border-b border-zinc-700 py-2 font-bold text-sm text-white cursor-pointer flex justify-between items-center"
              onClick={() => { setMostrarBuscador(true); setLocalidadQuery(''); }}
            >
              <span>{localidadElegida || 'Buscar...'}</span>
              <Search className="w-4 h-4 text-zinc-500" />
            </div>

            {/* Modal/Dropdown Buscador */}
            {mostrarBuscador && (
              <div className="absolute top-14 left-0 w-[200%] sm:w-[150%] -translate-x-1/2 sm:translate-x-0 bg-zinc-900 border border-zinc-800 shadow-2xl rounded-xl p-3 z-50">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Escribí tu barrio..." 
                  value={localidadQuery}
                  onChange={(e) => setLocalidadQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 mb-2"
                />
                <div className="max-h-48 overflow-y-auto no-scrollbar">
                  {localidadesFiltradas.length > 0 ? (
                    localidadesFiltradas.map(loc => (
                      <div 
                        key={loc} 
                        onClick={() => { setLocalidadElegida(loc); setMostrarBuscador(false); }}
                        className="py-2 px-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg cursor-pointer"
                      >
                        {loc}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-500 p-2 text-center">No se encontraron localidades</div>
                  )}
                </div>
                <button 
                  onClick={() => setMostrarBuscador(false)} 
                  className="w-full mt-2 py-1 text-xs text-zinc-500 font-bold hover:text-white"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Posición en la Cancha</label>
          <div className="flex gap-2">
            {['ARQ', 'DEF', 'MED', 'DEL'].map(p => (
              <button key={p} onClick={() => setPos(p)} className={`flex-1 py-3 rounded-xl font-black ${pos === p ? 'bg-blue-500 text-zinc-950 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-zinc-900 text-zinc-400'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => navigate('/welcome')} className="w-full bg-white text-zinc-950 font-black py-4 rounded-xl mt-6 active:scale-95 transition">
        GENERAR MI CARTA
      </button>
    </div>
  );
};

// ==========================================
// PANTALLA 4: Vista Carta (Welcome)
// ==========================================
export const Screen4WelcomeCard = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex flex-col items-center justify-center font-sans">
      <div className="relative w-64 h-96 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 rounded-3xl p-1 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
        <div className="relative h-full w-full bg-zinc-900 rounded-[22px] flex flex-col items-center p-6 text-white border-4 border-amber-400/30">
          <div className="absolute top-4 left-4 text-3xl font-black text-amber-400">50</div>
          <div className="absolute top-12 left-5 text-sm font-bold text-zinc-400">DEL</div>
          <div className="mt-8 mb-4 w-32 h-32 rounded-full bg-zinc-800 border-4 border-amber-400 flex items-center justify-center text-4xl">⚽</div>
          <h2 className="text-2xl font-black uppercase">EL RÚSTICO</h2>
          
          <div className="w-full border-t border-zinc-800 mt-auto pt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xl font-black text-amber-400">0</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Partidos</div>
            </div>
            <div>
              <div className="text-xl font-black text-amber-400">0</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Goles</div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm mt-8 space-y-3">
        <button onClick={() => navigate('/my-team')} className="w-full flex items-center justify-center gap-2 bg-amber-500 text-zinc-950 font-black py-4 rounded-xl shadow-lg">
          <Users className="w-5 h-5" /> Crear mi Equipo
        </button>
        <button onClick={() => navigate('/radar')} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-xl">
          <MapPinned className="w-5 h-5" /> Explorar Radar
        </button>
        <button className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-zinc-300 font-semibold py-3 rounded-xl">
          <Share2 className="w-4 h-4" /> Compartir en WA
        </button>
      </div>
    </div>
  );
};

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Icono personalizado para jugador libre
const iconoJugadorLibre = L.divIcon({
  className: 'marcador-jugador-libre',
  html: `<div style="width: 22px; height: 22px; border-radius: 50%; background: #3B82F6; border: 3px solid #18181b; box-shadow: 0 0 12px #3B82F6; display: flex; align-items: center; justify-content: center; font-size: 10px;">🏃</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

// Icono para cancha/predio
const iconoCancha = L.divIcon({
  className: 'marcador-cancha',
  html: `<div style="width: 26px; height: 26px; border-radius: 50%; background: #10B981; border: 3px solid #18181b; box-shadow: 0 0 15px #10B981; display: flex; align-items: center; justify-content: center; font-size: 12px;">🏟️</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

// ==========================================
// PANTALLA 5: El Radar Interactivo
// ==========================================
export const Screen5Radar = () => {
  const navigate = useNavigate();
  const [selectedPin, setSelectedPin] = useState<'player' | 'venue' | null>(null);

  // Coordenadas base (Lomas de Zamora / Guernica)
  const mapCenter = { lat: -34.9221, lng: -58.3842 }; 
  const playerMockLocation = { lat: -34.9201, lng: -58.3800 };
  const venueMockLocation = { lat: -34.9251, lng: -58.3900 };

  return (
    <div className="h-screen bg-zinc-900 relative font-sans overflow-hidden">
      
      {/* MAPA REAL: Usando Leaflet como en Fulbeando */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={14}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          <Marker 
            position={[playerMockLocation.lat, playerMockLocation.lng]} 
            icon={iconoJugadorLibre}
            eventHandlers={{ click: () => setSelectedPin('player') }}
          />

          <Marker 
            position={[venueMockLocation.lat, venueMockLocation.lng]} 
            icon={iconoCancha}
            eventHandlers={{ click: () => setSelectedPin('venue') }}
          />
        </MapContainer>
      </div>

      {/* FILTROS TOP */}
      <div className="absolute top-safe pt-4 px-4 w-full flex gap-2 overflow-x-auto no-scrollbar z-10">
        <button className="px-4 py-2 rounded-full bg-amber-500 text-amber-950 font-bold text-xs whitespace-nowrap shadow-lg">🔥 Desafíos</button>
        <button className="px-4 py-2 rounded-full bg-blue-600 text-white font-bold text-xs whitespace-nowrap shadow-lg">👤 Jugadores Libres</button>
        <button className="px-4 py-2 rounded-full bg-emerald-500 text-emerald-950 font-bold text-xs whitespace-nowrap shadow-lg">🏟️ Canchas</button>
      </div>

      {/* FAB - Lanzar Desafío */}
      <button onClick={() => navigate('/radar/challenge')} className="absolute bottom-24 right-4 bg-amber-500 text-zinc-950 p-4 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] z-10">
        <Search className="w-6 h-6" />
      </button>

      {/* BOTTOM SHEET (Si toca un pin) */}
      {selectedPin === 'player' && (
        <div className="absolute bottom-0 w-full bg-zinc-900 rounded-t-3xl border-t border-zinc-800 p-6 animate-in slide-in-from-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
          <button onClick={() => setSelectedPin(null)} className="absolute top-4 right-4 text-zinc-500">✕</button>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-zinc-800 rounded-full border-2 border-blue-500 flex items-center justify-center text-xl">🏃</div>
            <div>
              <h3 className="text-white font-black text-lg">Matias "El Rústico"</h3>
              <div className="flex gap-2 text-xs font-bold mt-1">
                <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">DEF</span>
                <span className="bg-amber-400/20 text-amber-500 px-2 py-0.5 rounded">⭐ 3.5 FP</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-zinc-800 text-white py-3 rounded-xl font-semibold border border-zinc-700 active:bg-zinc-700">Invitar a Hoy</button>
            <button className="bg-blue-600 text-white py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-95 transition">Fichar Jugador</button>
          </div>
        </div>
      )}

      {selectedPin === 'venue' && (
        <div className="absolute bottom-0 w-full bg-zinc-900 rounded-t-3xl border-t border-zinc-800 p-6 animate-in slide-in-from-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
          <button onClick={() => setSelectedPin(null)} className="absolute top-4 right-4 text-zinc-500">✕</button>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-zinc-800 rounded-full border-2 border-emerald-500 flex items-center justify-center text-xl">🏟️</div>
            <div>
              <h3 className="text-white font-black text-lg">El Templo F5</h3>
              <p className="text-xs text-zinc-400 mt-1">Guernica Centro • Sintético</p>
            </div>
          </div>
          <button className="w-full bg-emerald-500 text-zinc-950 py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition">Ver Canchas y Turnos</button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// PANTALLA 6: Lanzar Desafío
// ==========================================
export const Screen6LaunchChallenge = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-white">
      <button onClick={() => navigate(-1)} className="text-zinc-500 text-sm font-bold mb-6">← Cancelar</button>
      <h2 className="text-2xl font-black text-amber-500 mb-6">Lanzar Desafío al Radar</h2>

      <div className="space-y-6">
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase">Modalidad</label>
          <div className="flex gap-2 mt-2">
            {['F5', 'F7', 'F11'].map((m) => (
              <button key={m} className={`flex-1 py-3 rounded-xl font-black ${m === 'F5' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'}`}>{m}</button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase">Día y Hora</label>
          <input type="datetime-local" className="w-full bg-zinc-900 border-none rounded-xl px-4 py-3 mt-2 text-white outline-none" />
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase">¿Tienen Cancha?</label>
          <select className="w-full bg-zinc-900 border-none rounded-xl px-4 py-3 mt-2 text-white outline-none">
            <option>Sí, ya la alquilamos</option>
            <option>No, buscamos cancha a medias</option>
          </select>
        </div>
      </div>

      <button className="w-full bg-amber-500 text-zinc-950 font-black py-4 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] mt-8">
        PUBLICAR EN RADAR
      </button>
    </div>
  );
};

// ==========================================
// PANTALLA 7: Pestaña Mi Equipo
// ==========================================
export const Screen7MyTeam = () => {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white pb-20">
      {/* Header Equipo */}
      <div className="bg-zinc-900 p-6 pt-12 rounded-b-[40px] text-center relative border-b border-zinc-800">
        <div className="w-24 h-24 bg-zinc-800 mx-auto rounded-full border-4 border-amber-500 flex items-center justify-center text-3xl mb-4">🛡️</div>
        <h2 className="text-2xl font-black uppercase">La Scaloneta F5</h2>
        <p className="text-zinc-400 text-sm mt-1">Capitán: Lio Messi</p>
        <div className="flex justify-center gap-4 mt-4 text-sm font-bold">
          <div className="text-emerald-500">45 W</div>
          <div className="text-zinc-500">10 D</div>
          <div className="text-red-500">5 L</div>
        </div>
      </div>

      {/* Lista de Jugadores */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase">Plantel (5/10)</h3>
          <button className="text-amber-500 text-xs font-bold bg-amber-500/10 px-3 py-1 rounded-full">+ Invitar</button>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-amber-500">{i}</div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">Jugador {i}</h4>
                <p className="text-xs text-zinc-500 font-semibold">{i === 1 ? 'CAPITÁN' : 'JUGADOR'} • DEL</p>
              </div>
              <div className="bg-zinc-950 px-2 py-1 rounded font-black text-amber-400 text-sm border border-zinc-800">50</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PANTALLA 8: Registro de Complejo
// ==========================================
export const Screen8VenueRegistration = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex flex-col font-sans text-white">
      <h2 className="text-2xl font-black mt-8">Da de alta tu Complejo</h2>
      <p className="text-zinc-400 text-sm mt-2 mb-8">Completá los datos para aparecer en el radar de los jugadores.</p>

      <div className="space-y-6 flex-1">
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Nombre del Predio</label>
          <input type="text" placeholder="Ej: El Templo del Fútbol" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Ubicación</label>
          <input type="text" placeholder="Dirección exacta" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-zinc-500 cursor-pointer hover:border-emerald-500 transition">
          <UploadCloud className="w-8 h-8 mb-2" />
          <span className="text-sm font-bold">Subir foto de la cancha principal</span>
        </div>
      </div>

      <button onClick={() => navigate('/venue-subscription')} className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl mt-6">
        CONTINUAR
      </button>
    </div>
  );
};

// ==========================================
// PANTALLA 9: Suscripción de Predio
// ==========================================
export const Screen9VenueSubscription = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex flex-col items-center justify-center font-sans text-white text-center">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
        <Building className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-3xl font-black mb-2">Activá tu Predio</h2>
      <p className="text-zinc-400 text-sm px-4 mb-8">Para figurar en el radar y recibir partidos automáticos, requerimos una suscripción mensual.</p>
      
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-left">
        <h3 className="font-bold text-emerald-500 mb-4">Membresía PRO</h3>
        <p className="text-2xl font-black mb-1">$5.000 <span className="text-sm text-zinc-500 font-normal">/mes</span></p>
        <ul className="text-sm text-zinc-400 space-y-2 mt-6 mb-8">
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Presencia en el Radar en vivo</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Gestión de reservas inteligente</li>
        </ul>
        
        <button onClick={() => navigate('/venue-dashboard')} className="w-full bg-emerald-500 text-zinc-950 font-black py-3 rounded-xl flex items-center justify-center gap-2">
          Abonar y Activar
        </button>
      </div>
    </div>
  );
};

// ==========================================
// PANTALLA 10: Dashboard Dueño
// ==========================================
export const Screen10VenueDashboard = () => {
  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-white">
      <header className="flex justify-between items-center mb-8 mt-4">
        <div>
          <h1 className="text-2xl font-black">El Templo 🏟️</h1>
          <p className="text-emerald-500 text-xs font-bold uppercase mt-1">Activo en el Radar</p>
        </div>
        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-emerald-500 border border-emerald-500/30">
          4.8
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Partidos Hoy</p>
          <p className="text-2xl font-black">3</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Solicitudes</p>
          <p className="text-2xl font-black text-amber-500">2 Nuevas</p>
        </div>
      </div>

      <h2 className="text-sm font-bold text-zinc-500 uppercase mb-4">Bandeja de Entrada</h2>
      <div className="space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-full text-amber-500">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Desafío: La Scaloneta</h3>
            <p className="text-xs text-zinc-400 mt-1">Hoy 20:00hs • F5 Sintético</p>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </div>
      </div>
    </div>
  );
};
