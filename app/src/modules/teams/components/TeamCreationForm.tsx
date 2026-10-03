import React, { useState } from 'react';
import { Users, UploadCloud, ChevronRight } from 'lucide-react';

interface TeamCreationFormProps {
  onSubmit: (data: { name: string; modalidadBase: string; shieldFile?: File }) => void;
  isLoading: boolean;
}

export const TeamCreationForm: React.FC<TeamCreationFormProps> = ({ onSubmit, isLoading }) => {
  const [name, setName] = useState('');
  const [modalidad, setModalidad] = useState('F5');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name, modalidadBase: modalidad });
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Fundá tu Equipo</h2>
        <p className="text-slate-500 text-sm mt-1">Convertite en el Capitán y empezá a invitar.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* ESCUDO (UI Simplificada para carga) */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <UploadCloud className="w-8 h-8" />
          </div>
          <span className="text-xs text-slate-500 font-medium">Subir Escudo (Max 40KB WebP)</span>
        </div>

        {/* NOMBRE */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Equipo</label>
          <input 
            type="text" 
            placeholder="Ej: La Scaloneta F5" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition"
            required
          />
        </div>

        {/* MODALIDAD */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Modalidad Base</label>
          <div className="grid grid-cols-3 gap-3">
            {['F5', 'F7', 'F11'].map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => setModalidad(mod)}
                className={`py-2 rounded-xl font-black transition ${
                  modalidad === mod 
                  ? 'bg-amber-400 text-slate-900 shadow-md' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        {/* SUBMIT */}
        <button 
          type="submit" 
          disabled={isLoading || !name.trim()}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 font-bold py-4 rounded-xl shadow-lg mt-6 hover:opacity-90 transition disabled:opacity-50"
        >
          {isLoading ? 'Creando...' : (
            <>
              <Users className="w-5 h-5" />
              <span>Crear y Obtener Código</span>
              <ChevronRight className="w-5 h-5 ml-auto" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
