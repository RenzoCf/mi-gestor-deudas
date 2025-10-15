import React from 'react';
// Rutas relativas estándar. La sintaxis es correcta.
import SummaryCards from '../dashboard/SummaryCards.jsx';
import DebtList from '../dashboard/DebtList.jsx';

// Iconos para los botones del header
const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

function DebtsView() {
  // Datos de ejemplo para que la lista se vea como en el diseño
  const sampleDebts = [
    { id: 1, name: 'Banco de Crédito', dueDate: 'Vence: 15 de octubre de 2025', amount: '1,200.00', status: 'PENDIENTE' },
    { id: 2, name: 'Financiera Sol', dueDate: 'Venció: 20 de noviembre de 2024', amount: '850.00', status: 'PAGADO' },
    { id: 3, name: 'Cooperativa Futuro', dueDate: 'Vence: 5 de enero de 2026', amount: '1,400.00', status: 'VENCIDO' },
  ];

  return (
    <>
      {/* Header del Contenido */}
      <header className="flex justify-between items-center p-6 border-b bg-white">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Mis Deudas</h2>
          <p className="text-gray-600 mt-1">Hola de nuevo, aquí está tu resumen financiero.</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center text-gray-600 hover:text-blue-600">
            <BellIcon />
            <span className="hidden sm:block ml-2">Recordatorios</span>
          </button>
          <button className="flex items-center bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors">
            <PlusIcon />
            Agregar Nueva Deuda
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
        <SummaryCards />
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-800">Detalle de Deudas</h3>
          <DebtList debts={sampleDebts} />
        </div>
      </main>
    </>
  );
}

export default DebtsView;