import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AddDebtModal from "../components/dashboard/AddDebtModal";
import PaymentModal from "../components/dashboard/PaymentModal";
import ReceiptModal from "../components/dashboard/ReceiptModal";
import { useAuth } from "../context/AuthContext";
// Importar la función de amortización corregida desde debtServices.js
import { uploadReceipt, markPaymentAsPaid, calculateAmortizationSchedule as serviceCalculateAmortizationSchedule } from "../services/debtServices";

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
  const [selectedPayments, setSelectedPayments] = useState([]); // Pagos seleccionados para pago masivo

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

  // Helper para redondear a 2 decimales (para consistencia en el frontend)
  const round2 = (num) => Math.round(num * 100) / 100;

  // --- UTILIDADES ---
  const getDaysUntilDue = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + 'T00:00:00');
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  // 🔥 CORRECCIÓN CLAVE: La mora solo aplica cuando se cumple el mes completo
  const getOverdueMonths = (paymentDateStr, checkDate) => {
      const dueDate = new Date(paymentDateStr + "T00:00:00");
      
      // 1. Si la fecha de chequeo es anterior o igual a la fecha de vencimiento, el multiplicador es 0
      if (checkDate <= dueDate) return 0;

      let months = (checkDate.getFullYear() - dueDate.getFullYear()) * 12;
      months += checkDate.getMonth() - dueDate.getMonth();

      // 2. Ajuste para mes incompleto: Si el día de chequeo es menor al día de vencimiento,
      // significa que el ciclo completo del mes de mora aún no se cumple.
      if (checkDate.getDate() < dueDate.getDate()) {
          months--;
      }
      
      // 3. Devolver el número de meses completos (mínimo 0)
      return Math.max(0, months); 
  };

  // Re-asignamos la función de amortización del servicio
  const calculateAmortizationSchedule = serviceCalculateAmortizationSchedule;
  
  // --- DATOS Y CÁLCULOS PRINCIPALES ---
  const amortizationSchedule = debt.amortizationSchedule || calculateAmortizationSchedule(
    debt.principal || debt.totalAmount, debt.interestRate || 0, debt.installments, debt.interestPeriod || 'monthly'
  );
  
  const allPayments = debt.payments || [];
  let totalMoraAcumulada = 0; // Nuevo acumulador para la mora total
  
  const validPayments = allPayments.map(p => {
    const today = new Date();
    const daysUntilDue = getDaysUntilDue(p.date);
    let penaltyAmount = 0;
    let originalAmount = p.amount;
    let overdueMonths = 0;

    if (!p.paid && daysUntilDue < 0) {
        overdueMonths = getOverdueMonths(p.date, today);
        
        // Solo aplica si ha pasado un mes completo
        if (overdueMonths > 0) {
            // 1. Calcular la mora
            penaltyAmount = originalAmount * MORA_RATE * overdueMonths;
            
            // 2. Redondear la mora a 2 decimales para el cálculo consistente
            penaltyAmount = round2(penaltyAmount);
            
            // 3. Sumar la mora al acumulador global (ya redondeada)
            totalMoraAcumulada = round2(totalMoraAcumulada + penaltyAmount);
        }
    }

    // 4. Calcular el monto final a pagar (base + mora) y redondear
    const finalAmount = round2(originalAmount + penaltyAmount);

    return {
        ...p,
        amount: finalAmount, // Monto con mora redondeado
        originalAmount: originalAmount, // Monto sin mora
        penaltyAmount: penaltyAmount,
        overdueMonths: overdueMonths,
        daysUntilDue: daysUntilDue,
        isOverdue: daysUntilDue < 0 && !p.paid
    };
  });

  const totalPaidBase = validPayments.filter(p => p.paid).reduce((sum, p) => sum + (p.originalAmount || 0), 0);
  const totalPending = validPayments.filter(p => !p.paid).reduce((sum, p) => sum + (p.originalAmount || 0), 0);
  const paidInstallments = validPayments.filter(p => p.paid).length;
  const totalInstallments = debt.installments || 0;
  const progressPercentage = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;
  
  // CORRECCIÓN PARA CUADRAR AL 100%: Si todas las cuotas están pagadas, forzamos al Total Contrato.
  let totalPaid;
  if (progressPercentage >= 99.99) {
      totalPaid = debt.totalAmount;
  } else {
      totalPaid = totalPaidBase;
  }

  const firstUnpaidPayment = validPayments.find(p => !p.paid); // Primer pago pendiente de esta deuda

  // --- LÓGICA DE SELECCIÓN ---
  const togglePaymentSelection = (paymentId, isCurrentlySelected) => {
    if (isCurrentlySelected) {
      const deselectedPayment = validPayments.find(item => item.id === paymentId);
      if (!deselectedPayment) return;
      
      const deselectedDate = new Date(deselectedPayment.date);
      
      setSelectedPayments(prevSelected => {
        return prevSelected
          .filter(id => id !== paymentId) 
          .filter(id => new Date(validPayments.find(item => item.id === id).date) < deselectedDate);
      });
    } else {
      setSelectedPayments(prevSelected => [...prevSelected, paymentId]);
    }
  };
  
  const handleSelectAll = () => {
    if (selectedPayments.length === 0) {
        if (firstUnpaidPayment) {
            setSelectedPayments([firstUnpaidPayment.id]);
        }
        return;
    }
    
    const paymentsToSelect = validPayments
      .filter(p => !p.paid)
      .map(p => p.id);
      
    setSelectedPayments(paymentsToSelect);
  };
  

  const canSelectPayment = (currentPayment) => {
    if (currentPayment.paid) return false;

    if (selectedPayments.length === 0) {
      return currentPayment.id === firstUnpaidPayment?.id;
    }

    if (selectedPayments.includes(currentPayment.id)) return true;

    const selectedItems = validPayments
        .filter(item => selectedPayments.includes(item.id))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
        
    const lastSelectedItem = selectedItems[selectedItems.length - 1]; 
    
    if (!lastSelectedItem) return false;

    const nextPaymentDue = validPayments
        .filter(p => !p.paid)
        .find(p => new Date(p.date) > new Date(lastSelectedItem.date));


    if (nextPaymentDue && currentPayment.id === nextPaymentDue.id) {
        return true;
    }
    
    return false;
  };
  
  // --- MANEJO DE PAGOS Y EVENTOS ---
  const handleInitiateBulkPayment = () => {
    if (selectedPayments.length === 0) return;

    const bulkPayments = validPayments
      .filter(item => selectedPayments.includes(item.id))
      .sort((a, b) => new Date(a.date) - new Date(b.dueDate));

    // Aplicar round2 al total antes de pasarlo al modal
    const totalAmount = round2(bulkPayments.reduce((sum, item) => sum + item.amount, 0));

    const orderedPaymentIds = bulkPayments.map(item => item.id);
    
    setPaymentData({ 
        debtId: debt.id,
        paymentId: orderedPaymentIds, 
        amount: totalAmount, 
        lender: debt.lender + ` (${bulkPayments.length} cuotas)` 
    });
    setIsPaymentModalOpen(true);
  };

  const handleInitiateSinglePayment = (paymentId, amount) => {
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
    
    const paymentIdsToMark = Array.isArray(paymentId) ? paymentId : [paymentId];
    
    if (method === 'cash' && file) {
        receiptUrl = await uploadReceipt(file, user.id);
    }
    
    let successCount = 0;
    
    for (const id of paymentIdsToMark) {
        const result = await markPaymentAsPaid(id, method, receiptUrl);
        if (result.success) {
            successCount++;
        } else {
            console.error(`Error al marcar pago ${id}:`, result.error);
        }
    }

    if (successCount > 0) {
        window.location.reload(); 
    } else {
        alert(`⚠️ Error: No se pudo registrar el pago.`);
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

  const handleEdit = (editedDebt) => {
    onEditDebt(debt.id, editedDebt);
    setIsEditModalOpen(false);
    setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
  };

  const handleDelete = () => {
    onDeleteDebt(debt.id);
    navigate('/dashboard');
  };

  // Determinar si el botón individual de "Pagar" debe estar deshabilitado
  const isIndividualPayButtonDisabled = (currentPayment) => {
    // Regla 1: Deshabilitar si ya hay pagos seleccionados para el pago masivo.
    if (selectedPayments.length > 0) return true;
    
    // Regla 2: Deshabilitar si NO es el pago pendiente más antiguo (prioridad).
    if (firstUnpaidPayment && currentPayment.id !== firstUnpaidPayment.id) return true;
    
    return false;
  };
  
  // Determinar si el botón "Seleccionar Todo" debe ser visible
  const isSelectAllVisible = useMemo(() => {
    const pendingCount = validPayments.filter(p => !p.paid).length;
    // Visible si hay más de 1 pendiente y el primero ya está seleccionado
    return pendingCount > 1 && selectedPayments.length >= 1 && selectedPayments.length < pendingCount;
  }, [validPayments, selectedPayments.length]);

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
          <div>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Total Contrato</p>
            <p className="text-4xl font-black mt-1 tracking-tight">S/ {debt.totalAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-pink-300 text-xs font-bold uppercase tracking-widest">Interés Contrato</p>
            <p className="text-4xl font-black mt-1 text-pink-400 tracking-tight">S/ {debt.totalInterest.toFixed(2)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Mora Acumulada PENDIENTE</p>
            <p className="text-4xl font-black mt-1 text-red-500">S/ {round2(totalMoraAcumulada).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-green-400 text-xs font-bold uppercase tracking-widest">Pagado (Capital)</p>
            <p className="text-4xl font-black mt-1 text-green-400">S/ {round2(totalPaid).toFixed(2)}</p>
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
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-wide">Cronograma de Pagos</h3>
          </div>
          
          <div className="flex gap-3">
            {/* ✅ BOTÓN SELECCIONAR TODAS PENDIENTES */}
            {isSelectAllVisible && (
                <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-bold shadow-md transition transform hover:scale-105 flex items-center gap-2 text-sm"
                >
                    Seleccionar todas las pendientes
                </button>
            )}

            {selectedPayments.length > 0 && (
                <button
                    onClick={handleInitiateBulkPayment}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-2 text-sm"
                >
                    Pagar {selectedPayments.length} Cuota(s) Total: S/ {
                        round2(validPayments
                            .filter(item => selectedPayments.includes(item.id))
                            .reduce((sum, item) => sum + item.amount, 0)).toFixed(2)
                    }
                </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider w-16">✔</th>
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
                  
                  // Obtenemos la cuota de amortización (ya redondeada del servicio)
                  const amortRow = amortizationSchedule.find(a => a.cuota === idx + 1) || { capital: 0, interes: 0 };
                  
                  let rowClass = "";
                  let badgeClass = "";
                  let statusText = "";
                  let textClass = "text-gray-900"; 
                  
                  const isSelected = selectedPayments.includes(payment.id);
                  const canSelect = canSelectPayment(payment);
                  const individualPayDisabled = isIndividualPayButtonDisabled(payment);

                  if (payment.paid) {
                    rowClass = "bg-green-700 hover:bg-green-600 border-b border-green-800";
                    textClass = "text-white";
                    badgeClass = "bg-white text-green-800 font-bold border border-green-700 shadow";
                    statusText = "PAGADO";
                  } else {
                    if (payment.isOverdue) {
                      rowClass = "bg-red-700 hover:bg-red-600 border-b border-red-800 animate-pulse-slow"; 
                      textClass = "text-white";
                      badgeClass = "bg-white text-red-700 font-black border-2 border-red-900 shadow-md";
                      statusText = "VENCIDO";
                    } else if (payment.daysUntilDue <= 7) {
                      rowClass = "bg-orange-500 hover:bg-orange-400 border-b border-orange-600";
                      textClass = "text-white";
                      badgeClass = "bg-white text-orange-600 font-extrabold border border-orange-700 shadow";
                      statusText = payment.daysUntilDue === 0 ? "¡HOY!" : "PRÓXIMO";
                    } else {
                      rowClass = "hover:bg-gray-50 border-l-8 border-gray-200";
                      textClass = "text-gray-900";
                      badgeClass = "bg-gray-200 text-gray-700 font-bold border border-gray-300";
                      statusText = "PENDIENTE";
                    }
                  }
                  
                  if (isSelected && !payment.paid) {
                      rowClass += " ring-4 ring-indigo-300 shadow-xl";
                  }

                  return (
                    <tr key={payment.id} className={`transition-all duration-200 ${rowClass}`}>
                      
                      {/* CELDA DE SELECCIÓN */}
                      <td className="py-5 px-3 text-center">
                        {!payment.paid && (
                            <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!canSelect && !isSelected} 
                                onChange={() => togglePaymentSelection(payment.id, isSelected)}
                                className={`w-5 h-5 rounded transition-colors ${canSelect || isSelected ? 'border-indigo-600 text-indigo-600' : 'border-gray-400 opacity-50 cursor-not-allowed'}`}
                                title={!canSelect ? "Debes seleccionar la cuota anterior primero" : isSelected ? "Deseleccionar" : "Seleccionar para pago masivo"}
                            />
                        )}
                      </td>

                      <td className={`px-6 py-5 text-sm font-bold ${textClass}`}>{idx + 1}</td>
                      <td className={`px-6 py-5 text-sm font-bold ${textClass}`}>
                        {dueDateStr}
                      </td>
                      <td className={`px-6 py-5 text-sm text-right font-black text-lg ${textClass}`}>
                        {payment.penaltyAmount > 0 ? (
                            <div className="flex flex-col items-end">
                                <span>S/ {payment.amount.toFixed(2)}</span>
                                <div className="flex items-center gap-1 bg-white text-red-700 px-2 py-0.5 rounded shadow mt-1">
                                    {payment.isPaid ? (
                                        <span>+S/ {payment.penaltyAmount.toFixed(2)} Mora</span>
                                    ) : (
                                        <>
                                            <span className="line-through opacity-70 text-[10px] font-medium">S/ {payment.originalAmount.toFixed(2)}</span>
                                            <span className="text-[10px] font-bold">+{payment.overdueMonths}% MORA</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <span>S/ {payment.amount.toFixed(2)}</span>
                        )}
                      </td>
                      <td className={`px-6 py-5 text-sm text-right font-medium opacity-80 ${textClass}`}>S/ {round2(amortRow.capital).toFixed(2)}</td>
                      <td className={`px-6 py-5 text-sm text-right font-medium opacity-80 ${textClass}`}>S/ {round2(amortRow.interes).toFixed(2)}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex px-3 py-1.5 text-xs rounded-full tracking-wide ${badgeClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {!payment.paid ? (
                          <button
                            onClick={() => handleInitiateSinglePayment(payment.id, payment.amount)}
                            disabled={isIndividualPayButtonDisabled(payment)}
                            className={`px-5 py-2 bg-white text-gray-900 text-xs rounded-lg hover:bg-gray-100 shadow-lg transition transform font-bold flex items-center justify-center mx-auto gap-2 ${isIndividualPayButtonDisabled(payment) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                            title={isIndividualPayButtonDisabled(payment) ? "Pagar la cuota más antigua para habilitar" : "Pagar cuota individual"}
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
                <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400 font-bold text-lg">No hay pagos registrados.</td></tr>
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