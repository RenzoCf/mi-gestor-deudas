import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SummaryCards from "../components/dashboard/SummaryCards.jsx";
import AddDebtModal from "../components/dashboard/AddDebtModal.jsx";
import NotificationCenter from "../components/dashboard/NotificationCenter.jsx"; 
import PaymentModal from "../components/dashboard/PaymentModal.jsx";
import ReceiptModal from "../components/dashboard/ReceiptModal.jsx";
import { useAuth } from "../context/AuthContext";
import { uploadReceipt, markPaymentAsPaid } from "../services/debtServices";
import { registerPushNotification } from "../services/pushService"; 

const MORA_RATE = 0.01; // 1% de mora fija y universal

// Helper para redondear a 2 decimales para consistencia
const round2 = (num) => Math.round(num * 100) / 100;

function Dashboard({ debts = [], onAddDebt, onUpdateDebt }) {
  const { user } = useAuth();
  
  const [showPaidDebts, setShowPaidDebts] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [permStatus, setPermStatus] = useState(Notification.permission);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // ESTADOS PARA BÚSQUEDA Y SELECCIÓN MÚLTIPLE
  const [searchTerm, setSearchTerm] = useState(''); 
  const [selectedPayments, setSelectedPayments] = useState([]); 
  const [debtIdForBulkPayment, setDebtIdForBulkPayment] = useState(null); 

  const navigate = useNavigate();

  useEffect(() => {
    if ('Notification' in window) setPermStatus(Notification.permission);
  }, []);

  const handlePushClick = async () => {
    if (!user) return;
    if (permStatus === 'denied') {
      alert("🚫 Las notificaciones están bloqueadas. Actívalas en el candado de la URL.");
      return;
    }
    const permission = await Notification.requestPermission();
    setPermStatus(permission);
    if (permission === 'granted') {
      await registerPushNotification(user.id);
      alert("✅ ¡Avisos activados!");
    }
  };

  const getDaysUntilDue = (paymentDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(paymentDate + "T00:00:00");
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getValidPayments = (debt) => {
    if (!debt.payments || debt.payments.length === 0) return [];
    // Aseguramos que el amount base de la cuota esté redondeado para cálculos posteriores
    return debt.payments.map(p => ({
        ...p, 
        amount: round2(p.amount)
    })).filter(p => Math.abs(p.amount - round2(debt.cuota)) < 0.01);
  };
  
  // FUNCIÓN CLAVE: La mora solo aplica cuando se cumple el MES COMPLETO
  const getOverdueMonths = (paymentDateStr, checkDate) => {
      const dueDate = new Date(paymentDateStr + "T00:00:00");
      if (checkDate <= dueDate) return 0;
      let months = (checkDate.getFullYear() - dueDate.getFullYear()) * 12;
      months += checkDate.getMonth() - dueDate.getMonth();
      if (checkDate.getDate() < dueDate.getDate()) {
          months--;
      }
      return Math.max(0, months); 
  };
  
  // --- LÓGICA DE SELECCIÓN MÚLTIPLE ---

  const canSelectPayment = (payment) => {
    if (payment.isPaid) return false;

    // Caso A: No hay selección activa (Solo la primera cuota pendiente de CADA deuda es el punto de partida)
    if (selectedPayments.length === 0) {
        // Solo puede ser seleccionada si es la primera cuota pendiente de su deuda
        return payment.isNextPaymentForDebt;
    }

    // Caso B: Ya está seleccionada (permite deselección, aunque el toggle lo maneja)
    if (selectedPayments.includes(payment.paymentId)) return true;

    // Caso C: Hay selección activa, pero esta cuota es de OTRA deuda. (Bloqueo de deuda)
    if (payment.originalDebtId !== debtIdForBulkPayment) return false;

    // Caso D: Verificar consecutividad dentro de la deuda seleccionada.
    const selectedItems = filteredDebts
        .filter(item => selectedPayments.includes(item.paymentId))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    if (selectedItems.length === 0) return false;

    const lastSelectedItem = selectedItems[selectedItems.length - 1]; 
    
    // Buscar la siguiente cuota pendiente y no seleccionada para la MISMA deuda.
    // Usamos filteredDebts porque ya contiene todas las cuotas de la deuda cargada, ordenadas por fecha.
    const nextPaymentDue = filteredDebts
        .filter(p => p.originalDebtId === debtIdForBulkPayment && !p.isPaid && !selectedPayments.includes(p.paymentId))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .find(p => new Date(p.dueDate) > new Date(lastSelectedItem.dueDate));
    
    // Es seleccionable si es exactamente la siguiente cuota pendiente.
    return nextPaymentDue && payment.paymentId === nextPaymentDue.paymentId;
  };
  

  const togglePaymentSelection = (paymentId, currentDebtId, isCurrentlySelected) => {
    const paymentToToggle = filteredDebts.find(p => p.paymentId === paymentId);
    if (!paymentToToggle || paymentToToggle.isPaid) return;

    // 1. Deselección: Siempre permitida
    if (isCurrentlySelected) {
        setSelectedPayments(prevSelected => {
            const newSelected = prevSelected.filter(id => id !== paymentId);
            if (newSelected.length === 0) {
                setDebtIdForBulkPayment(null); // Resetear bloqueo
            }
            return newSelected;
        });
        return;
    }

    // 2. Selección:
    
    // Bloquear si la selección ya está activa en otra deuda
    if (debtIdForBulkPayment && currentDebtId !== debtIdForBulkPayment) return;

    // Si no pasa la validación de consecutividad/inicio, no permitir.
    if (!canSelectPayment(paymentToToggle)) return;

    // Si pasa la validación:
    if (!debtIdForBulkPayment) {
        // Iniciar una nueva selección (el canSelectPayment ya validó que es la primera)
        setDebtIdForBulkPayment(currentDebtId);
        setSelectedPayments([paymentId]);
    } else {
        // Continuar la selección
        setSelectedPayments(prevSelected => [...prevSelected, paymentId]);
    }
  };
  
  const handleSelectAll = () => {
      if (!debtIdForBulkPayment) return;

      const currentDebtPayments = filteredDebts
          .filter(p => p.originalDebtId === debtIdForBulkPayment && !p.isPaid)
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      const paymentsToSelect = currentDebtPayments.map(p => p.paymentId);
      setSelectedPayments(paymentsToSelect);
  };
  
  const handleInitiateBulkPayment = () => {
      if (selectedPayments.length === 0 || !debtIdForBulkPayment) return;

      const bulkPayments = filteredDebts
          .filter(item => selectedPayments.includes(item.paymentId))
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      const totalAmount = round2(bulkPayments.reduce((sum, item) => sum + item.amount, 0));
      const orderedPaymentIds = bulkPayments.map(item => item.paymentId);
      const debtInfo = bulkPayments[0];

      setPaymentData({ 
          debtId: debtIdForBulkPayment,
          paymentId: orderedPaymentIds,
          amount: totalAmount, 
          lender: debtInfo.lender + ` (${bulkPayments.length} cuotas)` 
      });
      setIsPaymentModalOpen(true);
  };

  // Resetear estados al cambiar de filtro o búsqueda
  useEffect(() => {
      setSelectedPayments([]);
      setDebtIdForBulkPayment(null);
  }, [showPaidDebts, searchTerm]); 
  
  // ... (otros handlers se mantienen)
  const handleInitiatePayment = (debtId, paymentId, amount, lender) => {
    setPaymentData({ debtId, paymentId, amount, lender });
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (debtId, paymentId, method, file) => {
    let receiptUrl = null;
    if (method === 'cash' && file) {
        receiptUrl = await uploadReceipt(file, user.id);
    }
    const paymentIdsToMark = Array.isArray(paymentId) ? paymentId : [paymentId];
    
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
        alert("Error: No se pudo registrar el pago.");
    }
  };

  const handleShowReceipt = (item) => {
    setReceiptData({
        id: item.paymentId,
        amount: item.amount,
        lender: item.lender,
        date: item.paidAt || new Date().toISOString(),
        method: item.payment_method || 'card',
        receiptUrl: item.receipt_url
    });
  };

  const handleSaveDebt = async (debtData) => {
    if (editingDebt) await onUpdateDebt(editingDebt.id, debtData);
    else await onAddDebt(debtData);
    setEditingDebt(null); setIsAddModalOpen(false);
  };
  
  // --- FILTRADO Y CÁLCULO DE MORA (TABLA) ---
  const filteredDebts = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    let rows = [];
    
    // Set para rastrear si ya encontramos el próximo pago pendiente para cada deuda (para la lógica de habilitar el botón PAGAR INDIVIDUAL)
    const nextPaymentFoundForDebt = new Set(); 
    
    // Normalizar término de búsqueda
    const lowerSearchTerm = searchTerm.toLowerCase();

    debts.forEach(debt => {
        // APLICAR FILTRO DE BÚSQUEDA
        const debtMatchesSearch = 
            debt.name.toLowerCase().includes(lowerSearchTerm) ||
            debt.lender.toLowerCase().includes(lowerSearchTerm);

        if (!debtMatchesSearch && lowerSearchTerm.length > 0) {
            return; // Saltar si no hay coincidencia y hay término de búsqueda
        }

        const validPayments = getValidPayments(debt);
        validPayments.forEach(payment => {
            const [pYear, pMonth] = payment.date.split('-').map(Number);
            const isPaid = payment.paid;
            const daysDiff = getDaysUntilDue(payment.date);

            const isCurrentMonth = (pYear === currentYear && pMonth === currentMonth);
            const isPast = (pYear < currentYear) || (pYear === currentYear && pMonth < currentMonth);

            let shouldShow = false;
            if (showPaidDebts) {
                shouldShow = isPaid; 
            } else {
                if (!isPaid && (isCurrentMonth || isPast)) shouldShow = true;
            }

            if (shouldShow) {
                let penaltyAmount = 0;
                let finalAmount = payment.amount; // Monto base
                let isPenaltyApplied = false;

                // CÁLCULO DE MORA
                if (daysDiff < 0 && !isPaid) {
                    const overdueMonths = getOverdueMonths(payment.date, today);
                    if (overdueMonths > 0) { // Solo si ha pasado un mes completo
                        penaltyAmount = payment.amount * MORA_RATE * overdueMonths;
                        finalAmount = payment.amount + penaltyAmount;
                        isPenaltyApplied = true;
                    }
                }
                // CÁLCULO DE MORA (PAGADAS, para historial)
                else if (isPaid && payment.paidAt) {
                    const paidAtDate = new Date(payment.paidAt);
                    const overdueMonthsPaid = getOverdueMonths(payment.date, paidAtDate);
                    
                    if (overdueMonthsPaid > 0) { // Solo si se pagó después de un mes completo de mora
                        penaltyAmount = payment.amount * MORA_RATE * overdueMonthsPaid;
                        finalAmount = payment.amount + penaltyAmount;
                        isPenaltyApplied = true;
                    }
                }
                
                // Redondear consistentemente
                penaltyAmount = round2(penaltyAmount);
                finalAmount = round2(finalAmount);

                // LÓGICA DE HABILITACIÓN DE BOTÓN INDIVIDUAL (Primera cuota pendiente de cada deuda)
                let isNextPaymentForDebt = false;
                if (!isPaid && !nextPaymentFoundForDebt.has(debt.id)) {
                    isNextPaymentForDebt = true;
                    nextPaymentFoundForDebt.add(debt.id); 
                }


                rows.push({
                    ...debt,
                    originalDebtId: debt.id,
                    paymentId: payment.id,
                    amount: finalAmount, 
                    originalAmount: payment.amount, 
                    penaltyAmount: penaltyAmount,
                    isPenaltyApplied: isPenaltyApplied,
                    dueDate: payment.date,
                    isPaid: isPaid,
                    daysUntilDue: daysDiff,
                    paidAt: payment.paidAt,
                    payment_method: payment.payment_method,
                    receipt_url: payment.receipt_url,
                    isNextPaymentForDebt: isNextPaymentForDebt // Flag para el botón individual
                });
            }
        });
    });
    // Ordenar por urgencia (días restantes)
    return rows.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [debts, showPaidDebts, searchTerm]);


  const summaryData = useMemo(() => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      let relevantPending = [];

      debts.forEach(debt => {
          const payments = getValidPayments(debt);
          payments.forEach(p => {
              if (p.paid) return;
              const [pYear, pMonth] = p.date.split('-').map(Number);
              const isCurrentMonth = (pYear === currentYear && pMonth === currentMonth);
              const isPast = (pYear < currentYear) || (pYear === currentYear && pMonth < currentMonth);

              if (isCurrentMonth || isPast) {
                  let amount = p.amount;
                  const daysDiff = getDaysUntilDue(p.date);
                  
                  // Aplicar Mora Acumulativa al resumen
                  if (daysDiff < 0) {
                      const overdueMonths = getOverdueMonths(p.date, today);
                      
                      if (overdueMonths > 0) { // Solo si ha pasado un mes completo
                          let penalty = p.amount * MORA_RATE * overdueMonths;
                          penalty = round2(penalty); // Redondear mora
                          amount = round2(amount + penalty);
                      }
                  }
                  relevantPending.push({ ...p, amount, daysUntilDue: daysDiff });
              }
          });
      });

      const total = relevantPending.reduce((sum, item) => sum + item.amount, 0);
      return {
          totalToPay: round2(total).toFixed(2),
          pendingInstallments: relevantPending.length,
          upcomingPaymentsCount: relevantPending.filter(p => p.daysUntilDue >= 0 && p.daysUntilDue <= 7).length
      };
  }, [debts]);

  return (
    <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Panel de Control</h2>
        <div className="flex items-center gap-4">
            {permStatus === 'default' && (
                <button onClick={handlePushClick} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition animate-pulse shadow-lg">
                    <span>🔔 Activar Avisos</span>
                </button>
            )}
            {permStatus === 'denied' && (
                <button onClick={handlePushClick} className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-bold hover:bg-red-700 transition shadow-md">
                    <span>🔕 Desbloquear</span>
                </button>
            )}
            {permStatus === 'granted' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-full text-xs font-bold shadow-md">
                    <span>✅ Avisos Activos</span>
                </div>
            )}
            <NotificationCenter notifications={notifications} />
        </div>
      </header>

      <SummaryCards summaryData={summaryData} />

      <section className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 uppercase tracking-wide">
            {showPaidDebts ? "📜 Historial" : "🔥 Deudas Pendientes"}
          </h3>
          <div className="flex gap-2">
            
            {/* BOTONES DE PAGO MASIVO */}
            {debtIdForBulkPayment && (
                 <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-bold shadow-md transition transform hover:scale-105 flex items-center gap-2 text-sm"
                >
                    Seleccionar Todas Pendientes
                </button>
            )}

            {selectedPayments.length > 0 && (
                <button
                    onClick={handleInitiateBulkPayment}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-2 text-sm"
                >
                    Pagar {selectedPayments.length} Cuota(s) Total: S/ {
                        round2(filteredDebts
                            .filter(item => selectedPayments.includes(item.paymentId))
                            .reduce((sum, item) => sum + item.amount, 0)).toFixed(2)
                    }
                </button>
            )}

            <button
              onClick={() => setShowPaidDebts(!showPaidDebts)}
              className={`px-4 py-2 border-2 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-sm ${
                showPaidDebts 
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {showPaidDebts ? "⬅️ Ver Pendientes" : "📜 Ver Historial"}
            </button>
            {!showPaidDebts && (
                <button
                onClick={() => { setEditingDebt(null); setIsAddModalOpen(true); }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md transition transform hover:scale-105"
                >
                + Nueva Deuda
                </button>
            )}
          </div>
        </div>

        {/* CAMPO DE BÚSQUEDA */}
        <div className="mb-4">
            <input
                type="text"
                placeholder="Buscar por nombre de deuda o entidad bancaria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
        </div>


        <div className="overflow-hidden rounded-xl shadow-xl ring-1 ring-black ring-opacity-5">
          <table className="w-full bg-white border-collapse">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="py-4 px-3 text-center font-extrabold uppercase text-xs tracking-wider w-16">✔</th>
                <th className="py-4 px-6 text-left font-extrabold uppercase text-xs tracking-wider">Deuda</th>
                <th className="py-4 px-6 text-center font-extrabold uppercase text-xs tracking-wider">Vencimiento</th>
                <th className="py-4 px-6 text-right font-extrabold uppercase text-xs tracking-wider">Monto</th>
                <th className="py-4 px-6 text-center font-extrabold uppercase text-xs tracking-wider">Estado</th>
                <th className="py-4 px-6 text-center font-extrabold uppercase text-xs tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDebts.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-gray-400 font-bold text-lg">
                    {showPaidDebts ? "No hay pagos registrados." : "¡Todo limpio! 🎉"}
                  </td></tr>
              ) : (
                filteredDebts.map((item) => {
                  const dateObj = new Date(item.dueDate + "T00:00:00");
                  const dateStr = dateObj.toLocaleDateString("es-PE", { day: '2-digit', month: 'short' });
                  
                  let statusBadge = "";
                  let statusText = "";
                  let rowClass = "transition-all duration-200"; 
                  let textClass = "text-gray-900"; 
                  
                  const isSelected = selectedPayments.includes(item.paymentId);
                  // La función canSelectPayment ahora controla la lógica de inicio y bloqueo
                  const isSelectable = canSelectPayment(item); 
                  const isButtonEnabled = !item.isPaid && item.isNextPaymentForDebt;

                  if (item.isPaid) {
                      rowClass = "bg-green-700 hover:bg-green-600 border-b border-green-800";
                      textClass = "text-white"; 
                      statusBadge = "bg-white text-green-800 font-extrabold shadow";
                      statusText = "PAGADO";
                  } else {
                      if (item.daysUntilDue < 0) {
                          rowClass = "bg-red-700 hover:bg-red-600 border-b border-red-800 animate-pulse-slow"; 
                          textClass = "text-white"; 
                          statusBadge = "bg-white text-red-700 font-extrabold shadow border-2 border-red-900";
                          statusText = `VENCIDO (${Math.abs(item.daysUntilDue)}d)`;
                      } else if (item.daysUntilDue <= 7) {
                          rowClass = "bg-yellow-500 hover:bg-yellow-400 border-b border-yellow-600";
                          textClass = "text-white";
                          statusBadge = "bg-white text-orange-600 font-extrabold shadow";
                          statusText = item.daysUntilDue === 0 ? "¡VENCE HOY!" : `${item.daysUntilDue} DÍAS`;
                      } else {
                          rowClass = "bg-white hover:bg-gray-50 border-l-8 border-l-blue-500";
                          textClass = "text-gray-900";
                          statusBadge = "bg-blue-600 text-white font-bold border border-blue-700 shadow";
                          statusText = "PENDIENTE";
                      }
                  }
                  
                  if (isSelected) {
                      rowClass += " ring-4 ring-indigo-300 shadow-xl";
                  }

                  // ACCIÓN: CHECKBOX DE SELECCIÓN MÚLTIPLE
                  return (
                    <tr key={`${item.paymentId}`} className={rowClass}>
                      <td className="py-5 px-3 text-center">
                        {!item.isPaid && (
                            <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isSelectable && !isSelected}
                                onChange={() => togglePaymentSelection(item.paymentId, item.originalDebtId, isSelected)}
                                className={`w-5 h-5 rounded transition-colors ${isSelectable || isSelected ? 'border-indigo-600 text-indigo-600' : 'border-gray-400 opacity-50 cursor-not-allowed'}`}
                                title={!isSelectable ? 
                                    (debtIdForBulkPayment && item.originalDebtId !== debtIdForBulkPayment ? "Solo puedes seleccionar cuotas de la deuda ya elegida." : "Debes seleccionar la primera cuota pendiente o una cuota consecutiva de esta deuda.")
                                    : ""
                                }
                            />
                        )}
                      </td>
                      <td className="py-5 px-6">
                        <div className={`font-black text-base tracking-tight ${textClass}`}>{item.name}</div>
                        <div className={`text-xs font-bold uppercase tracking-widest ${textClass} opacity-80`}>{item.lender}</div>
                      </td>
                      <td className={`py-5 px-6 text-center text-sm font-bold ${textClass}`}>{dateStr}</td>
                      <td className={`py-5 px-6 text-right font-extrabold text-xl ${textClass}`}>
                        {item.isPenaltyApplied ? (
                            <div className="flex flex-col items-end">
                                <span>S/ {item.amount.toFixed(2)}</span>
                                {/* Si tiene mora, mostramos el detalle */}
                                {item.penaltyAmount > 0 && (
                                    <div className="flex items-center gap-1 bg-white text-red-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm mt-1">
                                        {item.isPaid ? (
                                            <span>+S/ {item.penaltyAmount.toFixed(2)} Mora</span>
                                        ) : (
                                            <>
                                                <span className="line-through opacity-75">S/ {item.originalAmount.toFixed(2)}</span>
                                                <span>+{item.overdueMonths}% MORA</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span>S/ {item.amount.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-xs tracking-wide ${statusBadge}`}>{statusText}</span>
                      </td>
                      
                      {/* ACCIÓN: Botón PAGAR solo si está habilitado */}
                      <td className="py-5 px-6 text-center">
                        {!item.isPaid ? (
                            <button
                                onClick={() => handleInitiatePayment(item.originalDebtId, item.paymentId, item.amount, item.lender)}
                                // Se deshabilita si hay selección múltiple activa O si no es la primera cuota de su deuda.
                                disabled={selectedPayments.length > 0 || !isButtonEnabled}
                                className={`px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-bold flex items-center justify-center gap-2 shadow-lg transition transform ${
                                    (selectedPayments.length > 0 || !isButtonEnabled) ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'
                                }`}
                                title={selectedPayments.length > 0 ? 'Pagar individual deshabilitado durante selección múltiple' : !isButtonEnabled ? 'Pagar la cuota más antigua de esta deuda para habilitar' : 'Pagar cuota individual'}
                            >
                                💳 PAGAR
                            </button>
                        ) : (
                          <button 
                              onClick={() => handleShowReceipt(item)}
                              className="bg-white text-green-800 border-2 border-white px-4 py-1.5 rounded-lg text-xs hover:bg-green-50 font-bold shadow-sm"
                          >
                              📄 RECIBO
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AddDebtModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAddDebt={handleSaveDebt} 
        initialData={editingDebt} 
        isEditing={!!editingDebt} 
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

export default Dashboard;