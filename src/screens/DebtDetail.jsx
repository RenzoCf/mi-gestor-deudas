import React from "react";
import { useParams, useNavigate } from "react-router-dom";

function DebtDetail({ debts, onMarkAsPaid }) {
  const { debtId } = useParams();
  const navigate = useNavigate();

  const debt = debts.find(d => d.id === debtId);

  if (!debt) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-semibold text-lg mb-2">
            ⚠️ Deuda no encontrada
          </p>
          <p className="text-red-500 text-sm mb-4">
            La deuda que buscas no existe o fue eliminada.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Cálculos detallados
  const totalPaid = debt.payments
    .filter(p => p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = debt.payments
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  const paidInstallments = debt.payments.filter(p => p.paid).length;
  const pendingInstallments = debt.payments.filter(p => !p.paid).length;
  const progressPercentage = (paidInstallments / debt.payments.length) * 100;

  // Calcular interés pagado e interés pendiente
  const interestPerInstallment = debt.totalInterest / debt.installments;
  const interestPaid = interestPerInstallment * paidInstallments;
  const interestPending = debt.totalInterest - interestPaid;

  const handlePay = (paymentId) => {
    onMarkAsPaid(debt.id, paymentId);
  };

  // Tipo de interés en español
  const getInterestTypeLabel = (type) => {
    switch(type) {
      case 'unique': return 'Cargo único';
      case 'monthly': return 'Interés mensual';
      case 'annual': return 'Interés anual (TEA)';
      default: return 'N/A';
    }
  };

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Detalle de Deuda</h2>
          <p className="text-gray-500 mt-1">Información completa de tu deuda</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
        >
          <span>←</span> Volver
        </button>
      </div>

      {/* Información básica */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-indigo-100 text-sm mb-1">Nombre de la deuda</p>
            <p className="text-2xl font-bold">{debt.name}</p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm mb-1">Entidad</p>
            <p className="text-2xl font-bold">{debt.lender}</p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm mb-1">Estado</p>
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
              pendingInstallments === 0 
                ? "bg-green-500 text-white" 
                : "bg-yellow-400 text-gray-900"
            }`}>
              {pendingInstallments === 0 ? "✅ Pagado Completo" : "⏳ En Proceso"}
            </span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Progreso de pago</span>
            <span className="font-bold">{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white bg-opacity-30 rounded-full h-3">
            <div 
              className="bg-white h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs mt-1 text-indigo-100">
            <span>{paidInstallments} de {debt.payments.length} cuotas pagadas</span>
            <span>{pendingInstallments} restantes</span>
          </div>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monto Principal */}
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 mb-1">💰 Monto Principal</p>
          <p className="text-2xl font-bold text-gray-800">S/ {debt.principal?.toFixed(2) || '0.00'}</p>
          <p className="text-xs text-gray-500 mt-1">Sin intereses</p>
        </div>

        {/* Intereses Totales */}
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-orange-500">
          <p className="text-sm text-gray-500 mb-1">📈 Intereses Totales</p>
          <p className="text-2xl font-bold text-orange-600">S/ {debt.totalInterest?.toFixed(2) || '0.00'}</p>
          <p className="text-xs text-gray-500 mt-1">
            {debt.interestRate}% {getInterestTypeLabel(debt.interestPeriod)}
          </p>
        </div>

        {/* Monto Total */}
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-indigo-500">
          <p className="text-sm text-gray-500 mb-1">💳 Monto Total a Pagar</p>
          <p className="text-2xl font-bold text-indigo-600">S/ {debt.totalAmount?.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Principal + Intereses</p>
        </div>

        {/* Cuota Mensual */}
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-purple-500">
          <p className="text-sm text-gray-500 mb-1">📅 Cuota Mensual</p>
          <p className="text-2xl font-bold text-purple-600">S/ {debt.cuota?.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">{debt.installments} cuotas</p>
        </div>
      </div>

      {/* Estado de pagos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pagado hasta ahora */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-green-500">✅</span> Pagado Hasta Ahora
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total pagado:</span>
              <span className="text-xl font-bold text-green-600">S/ {totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cuotas pagadas:</span>
              <span className="text-lg font-semibold text-green-600">{paidInstallments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Intereses pagados:</span>
              <span className="text-lg font-semibold text-orange-600">S/ {interestPaid.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Pendiente por pagar */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-yellow-500">⏳</span> Pendiente por Pagar
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total pendiente:</span>
              <span className="text-xl font-bold text-yellow-600">S/ {totalPending.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cuotas pendientes:</span>
              <span className="text-lg font-semibold text-yellow-600">{pendingInstallments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Intereses por pagar:</span>
              <span className="text-lg font-semibold text-orange-600">S/ {interestPending.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de pagos detallado */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>📋</span> Historial de Pagos Detallado
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Vencimiento</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cuota</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Capital</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Interés</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Pago</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {debt.payments && debt.payments.length > 0 ? (
                debt.payments.map((payment, idx) => {
                  const dueDate = new Date(payment.date + 'T00:00:00');
                  const dueDateStr = dueDate.toLocaleDateString('es-PE', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  });
                  
                  const paidDate = payment.paidAt 
                    ? new Date(payment.paidAt).toLocaleDateString('es-PE', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      })
                    : '-';

                  // Calcular capital e interés aproximados por cuota
                  const capitalPorCuota = debt.principal / debt.installments;
                  const interesPorCuota = debt.totalInterest / debt.installments;

                  // Verificar si está vencido
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOverdue = !payment.paid && dueDate < today;

                  return (
                    <tr 
                      key={payment.id} 
                      className={`${
                        payment.paid 
                          ? 'bg-green-50' 
                          : isOverdue 
                          ? 'bg-red-50' 
                          : idx % 2 === 0 
                          ? 'bg-white' 
                          : 'bg-gray-50'
                      } hover:bg-gray-100 transition`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {dueDateStr}
                        {isOverdue && (
                          <span className="ml-2 text-red-600 font-bold">🚨</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        S/ {payment.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-blue-600">
                        S/ {capitalPorCuota.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-orange-600">
                        S/ {interesPorCuota.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {payment.paid ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                            ✅ Pagado
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold animate-pulse">
                            🚨 Vencido
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                            ⏳ Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600">
                        {paidDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {!payment.paid && (
                          <button
                            onClick={() => handlePay(payment.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 transition font-medium"
                          >
                            Marcar Pagado
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-gray-500">
                    No hay pagos registrados para esta deuda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Leyenda */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 font-semibold mb-2">📌 Información de la tabla:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li><strong>Capital:</strong> Parte del pago que reduce tu deuda principal</li>
            <li><strong>Interés:</strong> Parte del pago que corresponde a los intereses</li>
            <li><strong>Cuota:</strong> Monto total a pagar cada mes (Capital + Interés)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DebtDetail;