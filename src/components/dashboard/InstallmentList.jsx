import React from 'react';

// --- CAMBIO AQUÍ ---
// Añadimos ' = []' para asegurar que 'installments' siempre sea un array,
// incluso si no se recibe nada del componente padre.
function InstallmentList({ installments = [], onMarkAsPaid }) {

  // Función para formatear la fecha a DD/MM/YYYY
  const formatDate = (date) => {
    // Aseguramos que 'date' sea un objeto Date válido
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  // Función para dar estilo al estado de la cuota
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pagada':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800';
      case 'Atrasada':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800';
      default: // Pendiente
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Cuotas de Este Mes</h3>
      
      {installments.length === 0 ? (
        <p className="text-gray-500">No tienes cuotas programadas para este mes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deuda</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entidad</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto (PEN)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {installments.map((installment) => (
                <tr key={installment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{installment.debtName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{installment.lender}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(installment.dueDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{installment.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(installment.status)}>
                      {installment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {installment.status === 'Pendiente' ? (
                      <button 
                        onClick={() => onMarkAsPaid(installment.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Marcar como Pagada
                      </button>
                    ) : (
                      <span className="text-gray-400">Pagado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default InstallmentList;

