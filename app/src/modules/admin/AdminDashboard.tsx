import React from 'react';

export const AdminDashboard = () => {
  // Datos mockeados que simulan la carga de O(1) de system_metrics/dashboard_summary
  const metrics = {
    users: { total: 4250, newThisWeek: 132 },
    matches: { played: 890, pendingValidation: 45, disputed: 4 },
    venues: { active: 18, trial: 3 }
  };

  const disputedMatches = [
    { id: 'M123', local: 'Los Pibes FC', visitor: 'Real Bañil', localClaim: '5-4', visitorClaim: 'Faltaron', status: 'En Conflicto' }
  ];

  return (
    <div className="h-full bg-[#05080E] text-white font-sans flex flex-col md:flex-row">
      
      {/* Sidebar B2B */}
      <aside className="w-full md:w-64 bg-pitch-900 border-r border-pitch-700 p-6 flex flex-col">
        <h1 className="text-2xl font-black italic tracking-tighter text-white mb-8">
          AL ÁNGULO <span className="text-neon-green text-sm">ADMIN</span>
        </h1>
        <nav className="flex-1 space-y-4 text-sm font-medium">
          <a href="#" className="flex items-center text-neon-green bg-pitch-800 px-4 py-3 rounded-lg">📊 Visión General</a>
          <a href="#" className="flex items-center text-gray-400 hover:text-white px-4 py-2 transition-colors">⚖️ Sala de Arbitraje (4)</a>
          <a href="#" className="flex items-center text-gray-400 hover:text-white px-4 py-2 transition-colors">🏟️ Canchas / B2B</a>
          <a href="#" className="flex items-center text-gray-400 hover:text-white px-4 py-2 transition-colors">💰 Banners y Pauta</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        <header className="mb-8">
          <h2 className="text-3xl font-bold">Panel de Control General</h2>
          <p className="text-gray-400 text-sm mt-1">Métricas clave alimentadas atómicamente en tiempo real.</p>
        </header>

        {/* KPI Grid (Ahorro total de Firestore) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-pitch-900 border border-pitch-700 p-5 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-neon-green"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Usuarios Totales</p>
            <p className="text-3xl font-black">{metrics.users.total}</p>
            <p className="text-xs text-neon-green mt-2">+{metrics.users.newThisWeek} esta semana</p>
          </div>

          <div className="bg-pitch-900 border border-pitch-700 p-5 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Partidos Jugados</p>
            <p className="text-3xl font-black">{metrics.matches.played}</p>
            <p className="text-xs text-gray-500 mt-2">{metrics.matches.pendingValidation} validando</p>
          </div>

          <div className="bg-pitch-900 border border-pitch-700 p-5 rounded-xl shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Conflictos a Arbitrar</p>
            <p className="text-3xl font-black">{metrics.matches.disputed}</p>
            <p className="text-xs text-red-500 mt-2">Acción requerida urgente</p>
          </div>

          <div className="bg-pitch-900 border border-pitch-700 p-5 rounded-xl shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Canchas Premium</p>
            <p className="text-3xl font-black">{metrics.venues.active}</p>
            <p className="text-xs text-purple-400 mt-2">{metrics.venues.trial} en prueba gratuita</p>
          </div>
        </div>

        {/* Tabla de Arbitraje (Carga con limit(10) indexada) */}
        <section className="bg-pitch-900 border border-pitch-700 rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Sala de Arbitraje</h3>
            <button className="bg-pitch-800 text-gray-300 px-4 py-2 rounded-lg text-sm border border-pitch-700 hover:text-white transition-colors">
              Ver Historial
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-pitch-700 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="pb-4 font-semibold">Match ID</th>
                  <th className="pb-4 font-semibold">Rivalidad</th>
                  <th className="pb-4 font-semibold">Conflicto</th>
                  <th className="pb-4 font-semibold text-right">Acción Arbitral</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {disputedMatches.map((match) => (
                  <tr key={match.id} className="border-b border-pitch-800 hover:bg-pitch-800/50 transition-colors">
                    <td className="py-4 text-gray-500 font-mono text-xs">{match.id}</td>
                    <td className="py-4 font-bold">{match.local} <span className="text-gray-500 text-xs mx-2">vs</span> {match.visitor}</td>
                    <td className="py-4 text-red-400">{match.localClaim} vs {match.visitorClaim}</td>
                    <td className="py-4 text-right">
                      <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded mr-2 text-xs font-bold transition-colors">
                        Leer Chat
                      </button>
                      <button className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">
                        Sancionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
};
