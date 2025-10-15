import React from 'react';

function HomeView() {
  return (
    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
       <h2 className="text-2xl font-bold text-gray-800">Página de Inicio</h2>
       <p className="text-gray-600 mt-1">¡Bienvenido a Finanzas Edu!</p>
       <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <p>Aquí podríamos mostrar un resumen general o gráficos en el futuro.</p>
       </div>
    </main>
  );
}

export default HomeView;

