import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AddDebtModal from "../components/dashboard/AddDebtModal";

function DebtDetail({ debts, onMarkAsPaid, onEditDebt, onDeleteDebt }) {
  const { debtId } = useParams();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const debt = debts.find(d => String(d.id) === String(debtId));

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

  // 🔥 CALCULAR TABLA DE AMORTIZACIÓN (por si no viene del servicio)
  const calculateAmortizationSchedule = (principal, annualRate, installments, interestPeriod) => {
    const schedule = [];
    
    if (annualRate === 0 || interestPeriod === 'unique') {
      const capitalPorCuota = principal / installments;
      let interesPorCuota = 0;
      
      if (interestPeriod === 'unique' && annualRate > 0) {
        const totalInterest = (principal * annualRate) / 100;
        interesPorCuota = totalInterest / installments;
      }
      
      for (let i = 0; i < installments; i++) {
        schedule.push({
          cuota: i + 1,
          capital: capitalPorCuota,
          interes: interesPorCuota,
          cuotaMensual: capitalPorCuota + interesPorCuota,
          saldoInsoluto: principal - (capitalPorCuota * (i + 1))
        });
      }
      return schedule;
    }
    
    let r_monthly;
    
    if (interestPeriod === 'monthly') {
      r_monthly = annualRate / 100;
    } else if (interestPeriod === 'annual') {
      const r_annual = annualRate / 100;
      r_monthly = Math.pow(1 + r_annual, 1 / 12) - 1;
    }
    
    const pow = Math.pow(1 + r_monthly, installments);
    const cuotaFija = (principal * (r_monthly * pow)) / (pow - 1);
    
    let saldoInsoluto = principal;
    
    for (let i = 0; i < installments; i++) {
      const interesMes = saldoInsoluto * r_monthly;
      const capitalMes = cuotaFija - interesMes;
      
      schedule.push({
        cuota: i + 1,
        capital: capitalMes,
        interes: interesMes,
        cuotaMensual: cuotaFija,
        saldoInsoluto: Math.max(0, saldoInsoluto - capitalMes)
      });
      
      saldoInsoluto -= capitalMes;
    }
    
    return schedule;
  };

  // Calcular tabla de amortización si no existe
  const amortizationSchedule = debt.amortizationSchedule || calculateAmortizationSchedule(
    debt.principal || debt.totalAmount,
    debt.interestRate || 0,
    debt.installments,
    debt.interestPeriod || 'monthly'
  );
  
  const validPayments = debt.payments || [];

  // Cálculos usando pagos válidos
  const totalPaid = validPayments
    .filter(p => p.paid)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPending = validPayments
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const paidInstallments = validPayments.filter(p => p.paid).length;
  const pendingInstallments = validPayments.filter(p => !p.paid).length;
  const totalInstallments = debt.installments || 0;
  const progressPercentage = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;

  // Valores reales
  const principal = debt.principal || debt.totalAmount || 0;
  const totalInterest = debt.totalInterest || 0;
  const interestRate = debt.interestRate || 0;
  const interestPeriod = debt.interestPeriod || 'N/A';

  // 🔥 CALCULAR INTERESES PAGADOS Y PENDIENTES CORRECTAMENTE
  let interestPaid = 0;
  let interestPending = 0;

  amortizationSchedule.forEach((row, idx) => {
    if (validPayments[idx]?.paid) {
      interestPaid += row.interes;
    } else {
      interestPending += row.interes;
    }
  });

  const handlePay = (paymentId) => {
    onMarkAsPaid(debt.id, paymentId);
  };

  const handleEdit = (editedDebt) => {
    onEditDebt(debt.id, editedDebt);
    setIsEditModalOpen(false);
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 500);
  };

  const handleDelete = () => {
    onDeleteDebt(debt.id);
    navigate('/dashboard');
  };

  const getInterestTypeLabel = (type) => {
    switch(type) {
      case 'unique': return 'Cargo único';
      case 'monthly': return 'Interés mensual';
      case 'annual': return 'Interés anual (TEA)';
      case 'N/A': return 'Sin interés';
      default: return 'N/A';
    }
  };

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Header con botones de acción */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Detalle de Deuda</h2>
          <p className="text-gray-500 mt-1">Información completa de tu deuda</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
          >
            <span>←</span> Volver
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <span>✏️</span> Editar
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
          >
            <span>🗑️</span> Eliminar
          </button>
        </div>
      </div>

      {/* Confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Confirmar eliminación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar la deuda "{debt.name}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

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
            <span>{paidInstallments} de {totalInstallments} cuotas pagadas</span>
            <span>{pendingInstallments} restantes</span>
          </div>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 mb-1">💰 Monto Principal</p>
          <p className="text-2xl font-bold text-gray-800">S/ {principal.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Sin intereses</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-orange-500">
          <p className="text-sm text-gray-500 mb-1">📈 Intereses Totales</p>
          <p className="text-2xl font-bold text-orange-600">S/ {totalInterest.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {interestRate > 0 ? `${interestRate}% ${getInterestTypeLabel(interestPeriod)}` : 'Sin interés'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-indigo-500">
          <p className="text-sm text-gray-500 mb-1">💳 Monto Total a Pagar</p>
          <p className="text-2xl font-bold text-indigo-600">S/ {debt.totalAmount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Principal + Intereses</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-purple-500">
          <p className="text-sm text-gray-500 mb-1">📅 Cuota Mensual</p>
          <p className="text-2xl font-bold text-purple-600">S/ {debt.cuota.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">{totalInstallments} cuotas</p>
        </div>
      </div>

      {/* Estado de pagos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Historial de pagos */}
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Pago</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {validPayments.length > 0 ? (
                validPayments.map((payment, idx) => {
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

                  // 🔥 OBTENER DATOS DE LA TABLA DE AMORTIZACIÓN
                  const amortRow = amortizationSchedule[idx] || { capital: 0, interes: 0, saldoInsoluto: 0 };
                  const capitalPorCuota = amortRow.capital;
                  const interesPorCuota = amortRow.interes;
                  const saldoInsoluto = amortRow.saldoInsoluto;

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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                        S/ {saldoInsoluto.toFixed(2)}
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
                  <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                    No hay pagos registrados para esta deuda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 font-semibold mb-2">📌 Información de la tabla:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li><strong>Capital:</strong> Parte del pago que reduce tu deuda principal (calculado con Sistema Francés)</li>
            <li><strong>Interés:</strong> Parte del pago que corresponde a los intereses del mes</li>
            <li><strong>Saldo:</strong> Deuda restante después de pagar esta cuota</li>
            <li><strong>Cuota:</strong> Monto total a pagar cada mes (Capital + Interés)</li>
          </ul>
        </div>
      </div>

      {/* Modal de edición */}
      <AddDebtModal
        key={refreshTrigger}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onAddDebt={handleEdit}
        initialData={debt}
        isEditing={true}
      />
    </div>
  );
}

export default DebtDetail;