/**
 * TARJETA DEL RADAR (Se abre al tocar un Pin en el mapa)
 * DiseÃ±o condensado, tipografÃ­a fuerte y llamado a la acciÃ³n claro.
 */
export const RadarCard = () => {
  return (
    <div className="bg-pitch-800 rounded-2xl p-4 border border-pitch-700 shadow-2xl w-full max-w-sm animate-fade-in-up">
      
      {/* Top Info */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-pitch-900 rounded-full border border-gray-600 flex items-center justify-center text-2xl shadow-inner">
            ðŸº
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-lg leading-none mb-1">Los Lobos FC</h3>
            <div className="flex items-center space-x-1">
              <span className="text-neon-gold text-xs">â˜…â˜…â˜…â˜…â˜†</span>
              <span className="text-xs text-gray-400">(4.2)</span>
            </div>
          </div>
        </div>
        
        {/* Badge Modalidad */}
        <span className="bg-pitch-900 border border-gray-600 text-neon-green px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest shadow-sm">
          FÃºtbol 7
        </span>
      </div>
      
      {/* Detalles Geo/Tiempo */}
      <div className="bg-pitch-900 rounded-lg p-3 space-y-2 mb-4 text-xs font-medium text-gray-300 border border-pitch-800">
        <div className="flex items-center space-x-3">
          <span className="text-base opacity-70">ðŸ“…</span> 
          <span>Viernes 20:00 hs</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-base opacity-70">ðŸŸï¸</span> 
          {/* Alerta de "Pago a medias" en naranja para llamar la atencion */}
          <span className="text-neon-orange font-bold uppercase tracking-wide">Buscamos Cancha 50/50</span>
        </div>
      </div>

      {/* Botonera de AcciÃ³n */}
      <button className="w-full bg-neon-orange text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-neon-orange transition-transform active:scale-95">
        Lanzar DesafÃ­o
      </button>
    </div>
  );
};
