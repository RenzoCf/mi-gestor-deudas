import React, { useState } from 'react';

const NotificationCenter = ({ notifications = [] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* --- BOTÓN CAMPANITA --- */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors focus:outline-none"
      >
        {/* Icono de Campana SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Badge Rojo (Contador) */}
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full animate-bounce border-2 border-white">
            {notifications.length}
          </span>
        )}
      </button>

      {/* --- LISTA DESPLEGABLE TIPO APP/SMS --- */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="bg-indigo-600 p-3">
            <h3 className="text-white font-bold text-sm">Mensajes del Sistema</h3>
          </div>
          
          <div className="max-h-80 overflow-y-auto bg-gray-50 p-2 space-y-2">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">No tienes notificaciones nuevas</p>
            ) : (
              notifications.map((notif, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  {/* Simulación de burbuja de SMS */}
                  <div className={`p-3 rounded-2xl rounded-tl-none text-sm shadow-sm border ${
                    notif.type === 'today' 
                      ? 'bg-red-50 border-red-100 text-red-800' // Rojo urgente
                      : 'bg-white border-gray-200 text-gray-700' // Normal
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{notif.icon}</span>
                      <span className="font-bold text-xs uppercase tracking-wide opacity-70">
                        {notif.type === 'today' ? '¡URGENTE!' : 'Recordatorio'}
                      </span>
                    </div>
                    <p className="leading-snug">{notif.message}</p>
                    
                    {/* Enlace para agendar si es urgente */}
                    {notif.calendarLink && (
                        <a 
                            href={notif.calendarLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-indigo-600 font-bold text-xs hover:underline border border-indigo-200 px-2 py-1 rounded bg-white"
                        >
                            📅 Agendar en Google Calendar
                        </a>
                    )}

                    <p className="text-xs text-right mt-1 opacity-50 font-mono">
                        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Overlay transparente para cerrar al hacer clic afuera */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 cursor-default" 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default NotificationCenter;