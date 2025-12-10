import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SummaryCards from "../components/dashboard/SummaryCards.jsx";
import AddDebtModal from "../components/dashboard/AddDebtModal.jsx";
import NotificationCenter from "../components/dashboard/NotificationCenter.jsx"; 
import PaymentModal from "../components/dashboard/PaymentModal.jsx";
import ReceiptModal from "../components/dashboard/ReceiptModal.jsx";
import { useAuth } from "../context/AuthContext";
import { uploadReceipt, markPaymentAsPaid } from "../services/debtServices";
// Asegúrate de que este archivo exista en src/services/pushService.js
import { registerPushNotification } from "../services/pushService"; 

function Dashboard({ debts = [], onAddDebt, onUpdateDebt }) {
  const { user } = useAuth();
  
  const [showPaidDebts, setShowPaidDebts] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // ESTADO DE PERMISOS DE NOTIFICACIÓN
  // 'default' = No ha decidido (Mostrar botón activar)
  // 'granted' = Activado (No mostrar botón o mostrar check)
  // 'denied'  = Bloqueado (Mostrar botón rojo de ayuda)
  const [permStatus, setPermStatus] = useState(Notification.permission);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const navigate = useNavigate();

  // --- 1. VERIFICAR ESTADO AL CARGAR ---
  useEffect(() => {
    if ('Notification' in window) {
      setPermStatus(Notification.permission);
    }
  }, []);

  // --- MANEJADOR INTELIGENTE DE PERMISOS ---
  const handlePushClick = async () => {
    if (!user) return;

    if (permStatus === 'denied') {
      alert(
        "🚫 LAS NOTIFICACIONES ESTÁN BLOQUEADAS\n\n" +
        "Para activarlas:\n" +
        "1. Haz clic en el ícono del candado 🔒 o configuración a la izquierda de la URL.\n" +
        "2. Busca 'Notificaciones' y selecciona 'Permitir'.\n" +
        "3. Recarga la página."
      );
      return;
    }

    // Si es 'default' o cualquier otro, intentamos pedir permiso
    const permission = await Notification.requestPermission();
    setPermStatus(permission);

    if (permission === 'granted') {
      const success = await registerPushNotification(user.id);
      if (success) {
        alert("✅ ¡Listo! Recibirás avisos de tus vencimientos.");
      } else {
        alert("⚠️ Permiso concedido, pero hubo un error registrando el dispositivo.");
      }
    } else {
      // Si el usuario le dio a "Bloquear" en el popup
      alert("⚠️ Has denegado el permiso. No recibirás recordatorios.");
    }
  };

  // --- 2. CÁLCULOS AUXILIARES ---
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
    return debt.payments.filter(p => Math.abs(p.amount - debt.cuota) < 0.01);
  };

  // --- 3. NOTIFICACIONES INTERNAS ---
  useEffect(() => {
    const checkNotifications = () => {
      if (!debts.length) return;
      const newNotifications = [];

      debts.forEach(debt => {
        const validPayments = getValidPayments(debt);
        const nextUnpaid = validPayments.find(p => !p.paid);

        if (nextUnpaid) {
          const days = getDaysUntilDue(nextUnpaid.date);
          
          let amountToShow = nextUnpaid.amount;
          let moraText = "";
          
          if (days < 0 && debt.lateFee > 0) {
             const penalty = (nextUnpaid.amount * debt.lateFee) / 100;
             amountToShow += penalty;
             moraText = ` (Incl. mora S/ ${penalty.toFixed(2)})`;
          }

          const exactMessage = `Monto a pagar de ${debt.name} (${debt.lender}): S/ ${amountToShow.toFixed(2)}${moraText}`;

          if (days === 0) {
            newNotifications.push({ type: 'today', icon: '🚨', message: `¡HOY VENCE! ${exactMessage}` });
          } else if ([7, 4, 1].includes(days)) {
            newNotifications.push({ type: 'upcoming', icon: '📅', message: `Recordatorio (${days} días restantes): ${exactMessage}` });
          } else if (days < 0) {
             newNotifications.push({ type: 'overdue', icon: '⚠️', message: `VENCIDO hace ${Math.abs(days)} días: ${exactMessage}` });
          }
        }
      });
      setNotifications(newNotifications);
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 3600000);
    return () => clearInterval(interval);
  }, [debts]);

  // --- 4. MANEJO DE PAGOS ---
  const handleInitiatePayment = (debtId, paymentId, amount, lender) => {
    setPaymentData({ debtId, paymentId, amount, lender });
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (debtId, paymentId, method, file) => {
    let receiptUrl = null;
    if (method === 'cash' && file) {
        receiptUrl = await uploadReceipt(file, user.id);
    }
    const result = await markPaymentAsPaid(paymentId, method, receiptUrl);
    if (result.success) {
        window.location.reload(); 
    } else {
        alert("Error al guardar el pago: " + result.error);
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
                if (!isPaid) {
                    if (isCurrentMonth) shouldShow = true;
                    if (isPast) shouldShow = true;
                }
            }

            if (shouldShow) {
                let penaltyAmount = 0;
                let finalAmount = payment.amount;
                let isPenaltyApplied = false;

                if (daysDiff < 0 && !isPaid && (debt.lateFee > 0)) {
                    penaltyAmount = (payment.amount * debt.lateFee) / 100;
                    finalAmount = payment.amount + penaltyAmount;
                    isPenaltyApplied = true;
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
                  if (daysDiff < 0 && debt.lateFee > 0) {
                      amount += (p.amount * debt.lateFee) / 100;
                  }
                  relevantPending.push({ ...p, amount, daysUntilDue: daysDiff });
              }
          });
      });

      const total = relevantPending.reduce((sum, item) => sum + item.amount, 0);
      return {
          totalToPay: total.toFixed(2),
          pendingInstallments: relevantPending.length,
          upcomingPaymentsCount: relevantPending.filter(p => p.daysUntilDue >= 0 && p.daysUntilDue <= 7).length
      };
  }, [debts]);

  return (
    <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Panel de Control</h2>
        
        <div className="flex items-center gap-4">
            {/* --- BOTÓN DE ESTADO DE NOTIFICACIONES --- */}
            {permStatus === 'default' && (
                <button 
                    onClick={handlePushClick}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold hover:bg-indigo-200 transition animate-pulse"
                >
                    <span>🔔 Activar Avisos</span>
                </button>
            )}

            {permStatus === 'denied' && (
                <button 
                    onClick={handlePushClick}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold hover:bg-red-200 transition"
                    title="Las notificaciones están bloqueadas en tu navegador"
                >
                    <span>🔕 Desbloquear</span>
                </button>
            )}

            {permStatus === 'granted' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                    <span>✅ Avisos Activos</span>
                </div>
            )}
            
            <NotificationCenter notifications={notifications} />
        </div>
      </header>

      <SummaryCards summaryData={summaryData} />

      <section className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-700">
            {showPaidDebts ? "📜 Historial de Pagos" : "🔥 Pagos Pendientes (Este mes + Vencidos)"}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPaidDebts(!showPaidDebts)}
              className={`px-4 py-2 border rounded-md text-sm font-bold transition flex items-center gap-2 ${
                showPaidDebts 
                  ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {showPaidDebts ? "⬅️ Ver Pendientes" : "📜 Ver Historial Pagados"}
            </button>

            {!showPaidDebts && (
                <button
                onClick={() => { setEditingDebt(null); setIsAddModalOpen(true); }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold shadow-sm transition"
                >
                + Nueva Deuda
                </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg shadow ring-1 ring-black ring-opacity-5">
          <table className="w-full bg-white">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-3 px-4 text-left font-medium uppercase text-xs">Deuda</th>
                <th className="py-3 px-4 text-center font-medium uppercase text-xs">Vencimiento</th>
                <th className="py-3 px-4 text-right font-medium uppercase text-xs">Monto</th>
                <th className="py-3 px-4 text-center font-medium uppercase text-xs">Estado</th>
                <th className="py-3 px-4 text-center font-medium uppercase text-xs">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDebts.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-10 text-gray-500">
                    {showPaidDebts 
                        ? "No tienes pagos registrados en el historial." 
                        : "¡Todo limpio! No hay deudas pendientes este mes ni vencidas 🎉"}
                  </td></tr>
              ) : (
                filteredDebts.map((item) => {
                  const dateObj = new Date(item.dueDate + "T00:00:00");
                  const dateStr = dateObj.toLocaleDateString("es-PE", { day: '2-digit', month: 'short' });
                  
                  let statusBadge = "";
                  let statusText = "";
                  let rowClass = "hover:bg-gray-50";

                  if (item.isPaid) {
                      statusBadge = "bg-green-100 text-green-800 font-medium";
                      statusText = "Pagado";
                      rowClass = "bg-white opacity-75"; 
                  } else {
                      if (item.daysUntilDue < 0) {
                          statusBadge = "bg-red-100 text-red-800 font-bold border border-red-200";
                          statusText = `Vencido (${Math.abs(item.daysUntilDue)}d)`;
                          rowClass = "bg-red-50"; 
                      } else if (item.daysUntilDue <= 7) {
                          statusBadge = "bg-yellow-100 text-yellow-800 font-bold border border-yellow-200";
                          statusText = item.daysUntilDue === 0 ? "¡Vence HOY!" : `${item.daysUntilDue} días`;
                          rowClass = "bg-yellow-50";
                      } else {
                          statusBadge = "bg-blue-50 text-blue-700";
                          statusText = "Por vencer";
                      }
                  }

                  return (
                    <tr key={`${item.paymentId}`} className={`transition-colors duration-150 ${rowClass}`}>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.lender}</div>
                      </td>
                      <td className="py-4 px-4 text-center text-sm text-gray-700">{dateStr}</td>
                      <td className="py-4 px-4 text-right font-bold text-gray-800">
                        {item.isPenaltyApplied ? (
                            <div className="flex flex-col items-end">
                                <span className="text-red-600 text-lg">S/ {item.amount.toFixed(2)}</span>
                                <div className="flex items-center gap-1 opacity-75">
                                    <span className="text-[10px] text-gray-500 line-through">S/ {item.originalAmount.toFixed(2)}</span>
                                    <span className="text-[9px] text-red-600 bg-red-100 px-1 py-0.5 rounded font-bold">+{item.penaltyAmount.toFixed(2)} MORA</span>
                                </div>
                            </div>
                        ) : (
                            <span>S/ {item.amount.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs ${statusBadge}`}>{statusText}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            {!item.isPaid ? (
                                <>
                                <button
                                  onClick={() => handleInitiatePayment(item.originalDebtId, item.paymentId, item.amount, item.lender)}
                                  className="p-1.5 text-green-600 border border-green-200 bg-white rounded hover:bg-green-50 font-bold flex items-center gap-1 shadow-sm"
                                  title="Pagar ahora"
                                >
                                  💳 Pagar
                                </button>
                                <button 
                                    onClick={() => {
                                        const original = debts.find(d => d.id === item.originalDebtId);
                                        setEditingDebt(original); setIsAddModalOpen(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-gray-600"
                                >
                                    ✏️
                                </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => handleShowReceipt(item)}
                                    className="text-indigo-600 border border-indigo-200 px-3 py-1 rounded text-xs hover:bg-indigo-50 flex items-center gap-1 font-medium"
                                >
                                    📄 Ver Boleta
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