import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AddDebtModal from "../components/dashboard/AddDebtModal";
import PaymentModal from "../components/dashboard/PaymentModal";
import ReceiptModal from "../components/dashboard/ReceiptModal";
import { useAuth } from "../context/AuthContext";
import { uploadReceipt, markPaymentAsPaid } from "../services/debtServices";

const MORA_RATE = 0.01; // 1% de mora fija y universal

function DebtDetail({ debts, onEditDebt, onDeleteDebt }) {
  const { user } = useAuth();
  const { debtId } = useParams();
  const navigate = useNavigate();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const debt = debts.find(d => String(d.id) === String(debtId));

  if (!debt) {
    return (
      <div className="p-8">
        <div className="bg-red-600 text-white rounded-lg p-8 text-center shadow-xl">
          <p className="font-black text-2xl mb-4">⚠️ Deuda no encontrada</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-white text-red-700 font-bold rounded shadow hover:bg-gray-100">
            Volver
          </button>
        </div>
      </div>
    );
  }

  const getDaysUntilDue = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + 'T00:00:00');
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  // FUNCIÓN CLAVE: CALCULA CUÁNTOS MESES ESTÁ VENCIDA
  const getOverdueMonths = (paymentDateStr, todayDate) => {
      const dueDate = new Date(paymentDateStr + "T00:00:00");
      
      if (todayDate <= dueDate) return 0;

      let months = (todayDate.getFullYear() - dueDate.getFullYear()) * 12;
      months += todayDate.getMonth() - dueDate.getMonth();

      if (todayDate.getDate() < dueDate.getDate()) {
          months--;
      }
      
      return Math.max(0, months + 1); 
  };
  // FIN FUNCIÓN CLAVE

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
        receiptUrl = await uploadReceipt(file, user.id);
    }
    const result = await markPaymentAsPaid(paymentId, method, receiptUrl);
    if (result.success) window.location.reload(); 
    else alert("Error: " + result.error);
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
    <div className="p-8 space-y-6 bg-gray-100 min-h-screen">
      
      {/* HEADER CARD */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-lg border-l-8 border-indigo-600">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Detalle de Deuda</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xl font-bold text-gray-600">{debt.name}</span>
            <span className="text-gray-300">|</span>
            <span className="text-lg font-bold text-indigo-600 uppercase">{debt.lender}</span>
          </div>
          
          {/* NOTIFICACION DE MORA FIJA */}
          <div className="mt-4 inline-flex items-center gap-2 bg-red-700 text-white px-4 py-1.5 rounded-lg shadow-md">
            <span className="text-xl">⚠️</span>
            <span className="font-extrabold text-sm tracking-wide">MORA ACUMULATIVA: 1% por mes vencido</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <button onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition">
            ← Volver
          </button>
          <div className="flex gap-2">
            <button onClick={() => setIsEditModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow transition">
              ✏️ Editar
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow transition">
              🗑️ Borrar
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border-t-8 border-red-600">
            <h3 className="text-3xl font-black text-gray-900 mb-2">¿Eliminar?</h3>
            <p className="text-gray-600 font-semibold mb-8">Esta acción no se puede deshacer.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD STATS */}
      <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-30"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Total Deuda</p>
            <p className="text-4xl font-black mt-1 tracking-tight">S/ {debt.totalAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-green-400 text-xs font-bold uppercase tracking-widest">Pagado</p>
            <p className="text-4xl font-black mt-1 text-green-400">S/ {totalPaid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Pendiente</p>
            <p className="text-4xl font-black mt-1 text-red-500">S/ {totalPending.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-8">
          <div className="flex justify-between text-xs font-bold mb-2 text-indigo-200 uppercase">
            <span>Progreso de Pago</span>
            <span>{progressPercentage.toFixed(0)}% Completado</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-5 border border-gray-700 overflow-hidden">
            <div 
                className="bg-gradient-to-r from-green-500 to-emerald-400 h-full transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.5)]" 
                style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* TABLA DE PAGOS */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-wide">Cronograma de Pagos</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Vencimiento</th>
                <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Cuota Total</th>
                <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Capital</th>
                <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Interés</th>
                <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {validPayments.length > 0 ? (
                validPayments.map((payment, idx) => {
                  const dueDate = new Date(payment.date + 'T00:00:00');
                  const dueDateStr = dueDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
                  const amortRow = amortizationSchedule[idx] || { capital: 0, interes: 0 };
                  const daysUntilDue = getDaysUntilDue(payment.date);
                  
                  let rowClass = "";
                  let badgeClass = "";
                  let statusText = "";
                  let textClass = "text-gray-900"; 
                  let finalAmount = payment.amount;
                  let penaltyAmount = 0;
                  let hasPenalty = false;
                  
                  const today = new Date();
                  const overdueMonths = getOverdueMonths(payment.date, today);

                  if (payment.paid) {
                    rowClass = "bg-green-700 hover:bg-green-600 border-b border-green-800";
                    textClass = "text-white";
                    badgeClass = "bg-white text-green-800 font-bold border border-green-700 shadow";
                    statusText = "PAGADO";
                  } else {
                    if (daysUntilDue < 0) {
                      rowClass = "bg-red-700 hover:bg-red-600 border-b border-red-800 animate-pulse-slow"; 
                      textClass = "text-white";
                      badgeClass = "bg-white text-red-700 font-black border-2 border-red-900 shadow-md";
                      statusText = "VENCIDO";
                      
                      penaltyAmount = payment.amount * MORA_RATE * overdueMonths;
                      finalAmount = payment.amount + penaltyAmount;
                      hasPenalty = true;
                      
                    } else if (daysUntilDue <= 7) {
                      rowClass = "bg-yellow-500 hover:bg-yellow-400 border-b border-yellow-600";
                      textClass = "text-white";
                      badgeClass = "bg-white text-yellow-600 font-extrabold border border-yellow-700 shadow";
                      statusText = daysUntilDue === 0 ? "¡HOY!" : "PRÓXIMO";
                    } else {
                      rowClass = "hover:bg-gray-50 border-l-8 border-gray-200";
                      textClass = "text-gray-900";
                      badgeClass = "bg-gray-200 text-gray-700 font-bold border border-gray-300";
                      statusText = "PENDIENTE";
                    }
                  }

                  return (
                    <tr key={payment.id} className={`transition-all duration-200 ${rowClass}`}>
                      <td className={`px-6 py-5 text-sm font-bold ${textClass}`}>{idx + 1}</td>
                      <td className={`px-6 py-5 text-sm font-bold ${textClass}`}>
                        {dueDateStr}
                      </td>
                      <td className={`px-6 py-5 text-sm text-right font-black text-lg ${textClass}`}>
                        {hasPenalty ? (
                            <div className="flex flex-col items-end">
                                <span>S/ {finalAmount.toFixed(2)}</span>
                                <div className="flex items-center gap-1 bg-white text-red-700 px-2 py-0.5 rounded shadow mt-1">
                                    <span className="line-through opacity-70 text-[10px] font-medium">S/ {payment.amount.toFixed(2)}</span>
                                    <span className="text-[10px] font-bold">+{overdueMonths}% MORA</span>
                                </div>
                            </div>
                        ) : (
                            <span>S/ {payment.amount.toFixed(2)}</span>
                        )}
                      </td>
                      <td className={`px-6 py-5 text-sm text-right font-medium opacity-80 ${textClass}`}>S/ {amortRow.capital.toFixed(2)}</td>
                      <td className={`px-6 py-5 text-sm text-right font-medium opacity-80 ${textClass}`}>S/ {amortRow.interes.toFixed(2)}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex px-3 py-1.5 text-xs rounded-full tracking-wide ${badgeClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {!payment.paid ? (
                          <button
                            onClick={() => handleInitiatePayment(payment.id, finalAmount)}
                            className="px-5 py-2 bg-white text-gray-900 text-xs rounded-lg hover:bg-gray-100 shadow-lg hover:scale-105 transition transform font-bold flex items-center justify-center mx-auto gap-2"
                          >
                            <span>💳</span> PAGAR
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleShowReceipt(payment)}
                            className="bg-white text-green-800 border-2 border-white px-4 py-1.5 rounded-lg text-xs hover:bg-green-50 font-bold shadow-sm mx-auto"
                          >
                            📄 RECIBO
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 font-bold text-lg">No hay pagos registrados.</td></tr>
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
      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        onConfirmPayment={handleConfirmPayment}
        paymentData={paymentData}
      />
      <ReceiptModal 
        isOpen={!!receiptData} 
        onClose={() => setReceiptData(null)} 
        receiptData={receiptData}
      />
    </div>
  );
}

export default DebtDetail;