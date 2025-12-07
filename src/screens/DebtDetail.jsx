import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AddDebtModal from "../components/dashboard/AddDebtModal";
// IMPORTAMOS LOS NUEVOS COMPONENTES Y SERVICIOS
import PaymentModal from "../components/dashboard/PaymentModal";
import ReceiptModal from "../components/dashboard/ReceiptModal";
import { useAuth } from "../context/AuthContext";
import { uploadReceipt, markPaymentAsPaid } from "../services/debtServices";

function DebtDetail({ debts, onEditDebt, onDeleteDebt }) {
  const { user } = useAuth();
  const { debtId } = useParams();
  const navigate = useNavigate();
  
  // Estados para edición y borrado
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Estados para PAGOS y RECIBOS (Igual que en Dashboard)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const debt = debts.find(d => String(d.id) === String(debtId));

  if (!debt) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-semibold text-lg mb-2">⚠️ Deuda no encontrada</p>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --- CÁLCULOS (Igual que antes) ---
  const getDaysUntilDue = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + 'T00:00:00');
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateAmortizationSchedule = (principal, annualRate, installments, interestPeriod) => {
    const schedule = [];
    if (annualRate === 0 || interestPeriod === 'unique') {
      const capitalPorCuota = principal / installments;
      let interesPorCuota = 0;
      if (interestPeriod === 'unique' && annualRate > 0) {
        interesPorCuota = (principal * annualRate) / 100 / installments;
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
    if (interestPeriod === 'monthly') r_monthly = annualRate / 100;
    else if (interestPeriod === 'annual') r_monthly = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
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

  const amortizationSchedule = debt.amortizationSchedule || calculateAmortizationSchedule(
    debt.principal || debt.totalAmount,
    debt.interestRate || 0,
    debt.installments,
    debt.interestPeriod || 'monthly'
  );
  
  const validPayments = debt.payments || [];
  const totalPaid = validPayments.filter(p => p.paid).reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPending = validPayments.filter(p => !p.paid).reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidInstallments = validPayments.filter(p => p.paid).length;
  const totalInstallments = debt.installments || 0;
  const progressPercentage = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;

  // --- LÓGICA DE PAGO (NUEVA: IGUAL QUE DASHBOARD) ---
  
  const handleInitiatePayment = (paymentId, amount) => {
    setPaymentData({ 
        debtId: debt.id, 
        paymentId, 
        amount, 
        lender: debt.lender 
    });
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (debtId, paymentId, method, file) => {
    let receiptUrl = null;
    if (method === 'cash' && file) {
        console.log("Subiendo voucher desde detalle...");
        receiptUrl = await uploadReceipt(file, user.id);
    }
    const result = await markPaymentAsPaid(paymentId, method, receiptUrl);
    if (result.success) {
        window.location.reload(); 
    } else {
        alert("Error al guardar el pago: " + result.error);
    }
  };

  const handleShowReceipt = (payment) => {
    setReceiptData({
        id: payment.id,
        amount: payment.amount,
        lender: debt.lender,
        date: payment.paidAt || new Date().toISOString(),
        method: payment.payment_method || 'card',
        receiptUrl: payment.receipt_url
    });
  };

  // Otros manejadores
  const handleEdit = (editedDebt) => {
    onEditDebt(debt.id, editedDebt);
    setIsEditModalOpen(false);
    setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
  };

  const handleDelete = () => {
    onDeleteDebt(debt.id);
    navigate('/dashboard');
  };

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Detalle de Deuda</h2>
          <p className="text-gray-500 mt-1">{debt.name} - {debt.lender}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">← Volver</button>
          <button onClick={() => setIsEditModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">✏️ Editar</button>
          <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">🗑️ Eliminar</button>
        </div>
      </div>

      {/* CONFIRMACIÓN BORRAR */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar deuda?</h3>
            <p className="text-gray-600 mb-6">Esta acción borrará todo el historial.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* RESUMEN */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><p className="text-indigo-100 text-xs uppercase">Total Deuda</p><p className="text-2xl font-bold">S/ {debt.totalAmount.toFixed(2)}</p></div>
          <div><p className="text-indigo-100 text-xs uppercase">Pagado</p><p className="text-2xl font-bold">S/ {totalPaid.toFixed(2)}</p></div>
          <div><p className="text-indigo-100 text-xs uppercase">Pendiente</p><p className="text-2xl font-bold text-yellow-300">S/ {totalPending.toFixed(2)}</p></div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1"><span>Progreso</span><span>{progressPercentage.toFixed(0)}%</span></div>
          <div className="w-full bg-black bg-opacity-20 rounded-full h-2">
            <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* TABLA DE PAGOS */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">📋 Cronograma de Pagos</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cuota</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Capital</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Interés</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {validPayments.length > 0 ? (
                validPayments.map((payment, idx) => {
                  const dueDate = new Date(payment.date + 'T00:00:00');
                  const dueDateStr = dueDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
                  
                  const amortRow = amortizationSchedule[idx] || { capital: 0, interes: 0 };
                  
                  // COLORES (Igual que Dashboard)
                  const daysUntilDue = getDaysUntilDue(payment.date);
                  let rowClass = "hover:bg-gray-50";
                  let badgeClass = "bg-gray-100 text-gray-600";
                  let statusText = "Pendiente";

                  if (payment.paid) {
                    rowClass = "bg-green-50 hover:bg-green-100";
                    badgeClass = "bg-green-100 text-green-800 border border-green-200";
                    statusText = "Pagado";
                  } else {
                    if (daysUntilDue < 0) {
                      rowClass = "bg-red-50 hover:bg-red-100";
                      badgeClass = "bg-red-100 text-red-800 font-bold border border-red-200 animate-pulse";
                      statusText = "Vencido";
                    } else if (daysUntilDue <= 7) {
                      rowClass = "bg-yellow-50 hover:bg-yellow-100";
                      badgeClass = "bg-yellow-100 text-yellow-800 font-bold border border-yellow-200";
                      statusText = daysUntilDue === 0 ? "¡Vence HOY!" : "Próximo";
                    } else {
                      rowClass = "bg-white hover:bg-gray-50";
                      badgeClass = "bg-blue-50 text-blue-600 border border-blue-100";
                      statusText = "Pendiente";
                    }
                  }

                  return (
                    <tr key={payment.id} className={`transition-colors ${rowClass}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {dueDateStr}
                        {statusText === "Vencido" && <span className="ml-2">⚠️</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-gray-800">S/ {payment.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-blue-600">S/ {amortRow.capital.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600">S/ {amortRow.interes.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${badgeClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!payment.paid ? (
                          // BOTÓN PAGAR (Abre Pasarela)
                          <button
                            onClick={() => handleInitiatePayment(payment.id, payment.amount)}
                            className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 shadow-sm transition font-bold"
                          >
                            💳 Pagar
                          </button>
                        ) : (
                          // BOTÓN VER BOLETA
                          <button 
                            onClick={() => handleShowReceipt(payment)}
                            className="text-indigo-600 border border-indigo-200 px-3 py-1 rounded text-xs hover:bg-indigo-50 flex items-center gap-1 mx-auto"
                          >
                            📄 Ver Boleta
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="7" className="px-4 py-6 text-center text-gray-500">No hay pagos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddDebtModal
        key={refreshTrigger}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onAddDebt={handleEdit}
        initialData={debt}
        isEditing={true}
      />

      {/* COMPONENTE: PASARELA DE PAGO */}
      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        onConfirmPayment={handleConfirmPayment}
        paymentData={paymentData}
      />

      {/* COMPONENTE: VISOR DE BOLETAS */}
      <ReceiptModal 
        isOpen={!!receiptData} 
        onClose={() => setReceiptData(null)} 
        receiptData={receiptData}
      />
    </div>
  );
}

export default DebtDetail;