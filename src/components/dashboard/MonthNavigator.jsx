import React from 'react';

// Recibe la vista activa y la función para cambiarla
function MonthNavigator({ activeView, onViewChange }) {
  const views = ['Este Mes', 'Próximo Mes'];

  const getButtonClass = (view) => {
    return view === activeView
      ? "bg-indigo-100 text-indigo-700" // Estilo para el botón activo
      : "text-gray-500 hover:text-gray-700"; // Estilo para el inactivo
  };

  return (
    <div className="mb-4">
      <div className="flex p-1 bg-gray-100 rounded-lg">
        {views.map(view => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`w-full py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none ${getButtonClass(view)}`}
          >
            {view}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MonthNavigator;
