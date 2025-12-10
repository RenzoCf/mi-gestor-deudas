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
      
      // 3. Devolver el número de meses completos (mínimo 0), SIN FORZAR A 1
      return Math.max(0, months); 
  };
  // FIN FUNCIÓN CLAVE

  useEffect(() => {
    const checkNotifications = () => {
      if (!debts.length) return;
      const newNotifications = [];

      const today = new Date(); // Usar today para el cálculo de mora

      debts.forEach(debt => {
        const validPayments = getValidPayments(debt);
        const nextUnpaid = validPayments.find(p => !p.paid);

        if (nextUnpaid) {
          const days = getDaysUntilDue(nextUnpaid.date);
          let amountToShow = nextUnpaid.amount;
          let moraText = "";
          
          if (days < 0) {
             const overdueMonths = getOverdueMonths(nextUnpaid.date, today);
             let penalty = 0;

             // Solo aplica mora si ha pasado al menos un mes completo (overdueMonths > 0)
             if (overdueMonths > 0) {
                 penalty = nextUnpaid.amount * MORA_RATE * overdueMonths;
                 penalty = round2(penalty); // Redondear mora antes de sumar
                 amountToShow = round2(amountToShow + penalty);
                 moraText = ` (Incl. mora S/ ${penalty.toFixed(2)})`;
             }
          }

          const exactMessage = `Monto: S/ ${amountToShow.toFixed(2)}${moraText}`;

          if (days === 0) {
            newNotifications.push({ type: 'today', icon: '🚨', message: `¡HOY VENCE! ${exactMessage}` });
          } else if ([7, 4, 1].includes(days)) {
            newNotifications.push({ type: 'upcoming', icon: '📅', message: `Vence en ${days} días: ${exactMessage}` });
          } else if (days < 0) {
             newNotifications.push({ type: 'overdue', icon: '⚠️', message: `VENCIDO (${Math.abs(days)} días): ${exactMessage}` });
          }
        }
      });
      setNotifications(newNotifications);
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 3600000);
    return () => clearInterval(interval);
  }, [debts]);

  const handleInitiatePayment = (debtId, paymentId, amount, lender) => {
    setPaymentData({ debtId, paymentId, amount, lender });
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (debtId, paymentId, method, file) => {
    let receiptUrl = null;
    if (method === 'cash' && file) {
        receiptUrl = await uploadReceipt(file, user.id);
    }
    // Si paymentId es un array (pago masivo), markPaymentAsPaid debe iterar
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

    debts.forEach(debt => {
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

                // 1. CÁLCULO DE MORA ACUMULATIVA (PENDIENTES y VENCIDAS)
                if (daysDiff < 0 && !isPaid) {
                    const overdueMonths = getOverdueMonths(payment.date, today);
                    
                    if (overdueMonths > 0) { // Solo si ha pasado un mes completo
                        penaltyAmount = payment.amount * MORA_RATE * overdueMonths;
                        finalAmount = payment.amount + penaltyAmount;
                        isPenaltyApplied = true;
                    }
                }
                // 2. CÁLCULO DE MORA (PAGADAS, para historial)
                else if (isPaid && payment.paidAt) {
                    const paidAtDate = new Date(payment.paidAt);
                    const overdueMonthsPaid = getOverdueMonths(payment.date, paidAtDate);
                    
                    if (overdueMonthsPaid > 0) { // Solo si se pagó después de un mes completo de mora
                        penaltyAmount = payment.amount * MORA_RATE * overdueMonthsPaid;
                        finalAmount = payment.amount + penaltyAmount;
                        isPenaltyApplied = true; // Indica que se pagó una mora
                    }
                }
                
                // Redondear consistentemente
                penaltyAmount = round2(penaltyAmount);
                finalAmount = round2(finalAmount);


                rows.push({
                    ...debt,
                    originalDebtId: debt.id,
                    paymentId: payment.id,
                    amount: finalAmount, // Monto Total Pagado (Base + Mora)
                    originalAmount: payment.amount, // Monto base de la cuota
                    penaltyAmount: penaltyAmount,
                    isPenaltyApplied: isPenaltyApplied,
                    dueDate: payment.date,
                    isPaid: isPaid,
                    daysUntilDue: daysDiff,
                    paidAt: payment.paidAt,
                    payment_method: payment.payment_method,
                    receipt_url: payment.receipt_url
                });
            }
        });
    });
    return rows.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [debts, showPaidDebts]);

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

        <div className="overflow-hidden rounded-xl shadow-xl ring-1 ring-black ring-opacity-5">
          <table className="w-full bg-white border-collapse">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="py-4 px-6 text-left font-extrabold uppercase text-xs tracking-wider">Deuda</th>
                <th className="py-4 px-6 text-center font-extrabold uppercase text-xs tracking-wider">Vencimiento</th>
                <th className="py-4 px-6 text-right font-extrabold uppercase text-xs tracking-wider">Monto</th>
                <th className="py-4 px-6 text-center font-extrabold uppercase text-xs tracking-wider">Estado</th>
                <th className="py-4 px-6 text-center font-extrabold uppercase text-xs tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDebts.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-12 text-gray-400 font-bold text-lg">
                    {showPaidDebts ? "No tienes pagos registrados." : "¡Todo limpio! 🎉"}
                  </td></tr>
              ) : (
                filteredDebts.map((item) => {
                  const dateObj = new Date(item.dueDate + "T00:00:00");
                  const dateStr = dateObj.toLocaleDateString("es-PE", { day: '2-digit', month: 'short' });
                  
                  let statusBadge = "";
                  let statusText = "";
                  
                  let rowClass = "transition-all duration-200"; 
                  let textClass = "text-gray-900"; 

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

                  return (
                    <tr key={`${item.paymentId}`} className={rowClass}>
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
                                                <span>+{((item.penaltyAmount / item.originalAmount) * 100).toFixed(0)}% MORA</span>
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
                      <td className="py-5 px-6 text-center">
                        <div className="flex items-center justify-center gap-3">
                            {!item.isPaid ? (
                                <>
                                <button
                                  onClick={() => handleInitiatePayment(item.originalDebtId, item.paymentId, item.amount, item.lender)}
                                  className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-bold flex items-center gap-2 shadow-lg transform hover:-translate-y-0.5 transition"
                                >
                                  💳 PAGAR
                                </button>
                                <button 
                                    onClick={() => {
                                        const original = debts.find(d => d.id === item.originalDebtId);
                                        setEditingDebt(original); setIsAddModalOpen(true);
                                    }}
                                    className={`p-2 rounded-full transition ${textClass} hover:bg-white/20`}
                                >
                                    ✏️
                                </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => handleShowReceipt(item)}
                                    className="bg-white text-green-800 border-2 border-white px-4 py-1.5 rounded-lg text-xs hover:bg-green-50 font-bold shadow-sm"
                                >
                                    📄 RECIBO
                                </button>
                            )}
                        </div>
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