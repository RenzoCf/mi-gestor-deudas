import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SummaryCards from "../components/dashboard/SummaryCards.jsx";
import AddDebtModal from "../components/dashboard/AddDebtModal.jsx";
import NotificationCenter from "../components/dashboard/NotificationCenter.jsx";
import PaymentModal from "../components/dashboard/PaymentModal.jsx";
import ReceiptModal from "../components/dashboard/ReceiptModal.jsx";
import { useAuth } from "../context/AuthContext";
import { uploadReceipt, markPaymentAsPaid } from "../services/debtServices";

function Dashboard({ debts = [], onAddDebt, onUpdateDebt }) {
  const { user } = useAuth();
  
  // false = MODO PENDIENTES (Por defecto)
  // true  = MODO HISTORIAL (Solo pagados)
  const [showPaidDebts, setShowPaidDebts] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Estados para los modales de pago y recibo
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const navigate = useNavigate();

  // --- 1. CÁLCULOS AUXILIARES ---
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

  const createCalendarLink = (debtName, amount, dueDateStr) => {
    const date = new Date(dueDateStr + "T00:00:00");
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateFormatted = `${yyyy}${mm}${dd}`;
    const title = encodeURIComponent(`Pagar: ${debtName}`);
    const details = encodeURIComponent(`Monto: S/ ${amount.toFixed(2)}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dateFormatted}/${dateFormatted}`;
  };

  // --- 2. SISTEMA DE NOTIFICACIONES ---
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const checkNotifications = () => {
      if (!debts.length) return;
      const newNotifications = [];

      debts.forEach(debt => {
        const validPayments = getValidPayments(debt);
        const nextUnpaid = validPayments.find(p => !p.paid);

        if (nextUnpaid) {
          const days = getDaysUntilDue(nextUnpaid.date);
          const exactMessage = `Monto a pagar de ${debt.name} (${debt.lender}): S/ ${nextUnpaid.amount.toFixed(2)}`;

          if (days === 0) {
            newNotifications.push({
              type: 'today',
              icon: '🚨',
              message: `¡HOY VENCE! ${exactMessage}`,
              calendarLink: createCalendarLink(debt.name, nextUnpaid.amount, nextUnpaid.date)
            });
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("⚠️ Vencimiento Hoy", { body: exactMessage, icon: '/vite.svg' });
            }
          }
          else if ([7, 4, 1].includes(days)) {
            newNotifications.push({
              type: 'upcoming',
              icon: '📅',
              message: `Recordatorio (${days} días restantes): ${exactMessage}`,
              calendarLink: createCalendarLink(debt.name, nextUnpaid.amount, nextUnpaid.date)
            });
            if ("Notification" in window && Notification.permission === "granted") {
               new Notification(`📅 Recordatorio de Pago (${days} días)`, { body: exactMessage, icon: '/vite.svg' });
            }
          }
          else if (days < 0) {
             newNotifications.push({
              type: 'overdue',
              icon: '⚠️',
              message: `VENCIDO hace ${Math.abs(days)} días: ${exactMessage}`
            });
          }
        }
      });
      setNotifications(newNotifications);
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 3600000);
    return () => clearInterval(interval);
  }, [debts]);

  // --- 3. MANEJO DE PAGOS REALES ---
  
  // Abrir la pasarela
  const handleInitiatePayment = (debtId, paymentId, amount, lender) => {
    setPaymentData({ debtId, paymentId, amount, lender });
    setIsPaymentModalOpen(true);
  };

  // Confirmar pago desde la pasarela (recibe archivo si es efectivo)
  const handleConfirmPayment = async (debtId, paymentId, method, file) => {
    let receiptUrl = null;

    // Si es efectivo, subimos la foto
    if (method === 'cash' && file) {
        console.log("Subiendo voucher...");
        receiptUrl = await uploadReceipt(file, user.id);
    }

    // Guardar en base de datos
    const result = await markPaymentAsPaid(paymentId, method, receiptUrl);
    
    if (result.success) {
        // Recargar página para ver cambios (Simple y efectivo)
        window.location.reload(); 
    } else {
        alert("Error al guardar el pago: " + result.error);
    }
  };

  // Ver recibo/boleta
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

  // --- 4. FILTRADO INTELIGENTE ---
  const filteredDebts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let rows = [];

    debts.forEach(debt => {
        const validPayments = getValidPayments(debt);
        validPayments.forEach(payment => {
            const payDate = new Date(payment.date + "T00:00:00");
            payDate.setHours(0, 0, 0, 0);
            const isPaid = payment.paid;
            
            // Reglas de visualización:
            const isCurrentMonth = payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear;
            const isPast = payDate < today;

            // Mostrar si es mes actual O (es pasado Y está pendiente)
            // Si es pasado y pagado, solo sale en historial si coincide con mes actual o se fuerza lógica
            // Para simplificar: En historial mostramos TODO lo pagado de este mes o meses anteriores si el usuario quiere ver "historial".
            // Pero tu requerimiento fue estricto:
            
            // CONDICIÓN:
            // 1. Si es mes actual, entra siempre.
            // 2. Si es mes pasado:
            //    - Si NO está pagado, entra siempre (para que lo pagues).
            //    - Si SÍ está pagado, entra solo si showPaidDebts es true.
            
            const shouldShow = isCurrentMonth || (!isPaid && isPast) || (isPaid && showPaidDebts);

            if (shouldShow) {
                // Filtro interruptor final
                if (showPaidDebts !== isPaid) return;

                rows.push({
                    ...debt,
                    originalDebtId: debt.id,
                    paymentId: payment.id,
                    amount: payment.amount,
                    dueDate: payment.date,
                    isPaid: isPaid,
                    daysUntilDue: getDaysUntilDue(payment.date),
                    // Datos extra para el recibo
                    paidAt: payment.paidAt,
                    payment_method: payment.payment_method,
                    receipt_url: payment.receipt_url
                });
            }
        });
    });
    return rows.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [debts, showPaidDebts]);

  // --- 5. RESUMEN DE TARJETAS (Solo pendientes reales) ---
  const summaryData = useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      let relevantPending = [];

      debts.forEach(debt => {
          const payments = getValidPayments(debt);
          payments.forEach(p => {
              if (p.paid) return; // Ignorar pagados para la suma

              const payDate = new Date(p.date + "T00:00:00");
              payDate.setHours(0, 0, 0, 0);

              const isCurrentMonth = payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear;
              const isOverdue = payDate < today;

              if (isCurrentMonth || isOverdue) {
                  relevantPending.push({
                      ...p,
                      daysUntilDue: getDaysUntilDue(p.date)
                  });
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
        <NotificationCenter notifications={notifications} />
      </header>

      {/* Tarjetas de Resumen (Siempre muestran deuda real) */}
      <SummaryCards summaryData={summaryData} />

      <section className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-700">
            {showPaidDebts ? "📜 Historial de Pagos Realizados" : "🔥 Pagos Pendientes y Por Vencer"}
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
              {showPaidDebts ? "⬅️ Volver a Pendientes" : "📜 Ver Historial Pagados"}
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
                        ? "No hay historial de pagos recientes." 
                        : "¡Estás al día! No hay deudas pendientes por mostrar 🎉"}
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
                      statusText = "Completado";
                      rowClass = "bg-white"; 
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
                          statusText = `${item.daysUntilDue} días`;
                      }
                  }

                  return (
                    <tr key={`${item.paymentId}`} className={`transition-colors duration-150 ${rowClass}`}>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.lender}</div>
                      </td>
                      <td className="py-4 px-4 text-center text-sm text-gray-700">{dateStr}</td>
                      <td className="py-4 px-4 text-right font-bold text-gray-800">S/ {item.amount.toFixed(2)}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs ${statusBadge}`}>{statusText}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            {!item.isPaid ? (
                                <>
                                <a 
                                    href={createCalendarLink(item.name, item.amount, item.dueDate)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-blue-600 border border-blue-200 bg-white rounded hover:bg-blue-50"
                                    title="Agendar recordatorio"
                                >
                                    📲
                                </a>
                                <button
                                  onClick={() => handleInitiatePayment(item.originalDebtId, item.paymentId, item.amount, item.lender)}
                                  className="p-1.5 text-green-600 border border-green-200 bg-white rounded hover:bg-green-50 font-bold flex items-center gap-1"
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

export default Dashboard;