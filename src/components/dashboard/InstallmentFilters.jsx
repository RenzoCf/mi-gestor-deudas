import React from 'react';

// Recibe el filtro activo y la función para cambiarlo
function InstallmentFilters({ activeFilter, onFilterChange }) {
  const filters = ['Todas', 'Pendientes', 'Atrasadas', 'Pagadas'];

  const getButtonClass = (filter) => {
    // Si el filtro es el activo, le damos un estilo diferente
    if (filter === activeFilter) {
      return "bg-indigo-600 text-white";
    }
    // Estilo para los botones inactivos
    return "bg-white text-gray-700 hover:bg-gray-50";
  };

  return (
    <div className="mb-4">
      <div className="flex space-x-2">
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${getButtonClass(filter)}`}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}

export default InstallmentFilters;
