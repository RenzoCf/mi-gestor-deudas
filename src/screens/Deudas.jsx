import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationCenter from "../components/dashboard/NotificationCenter.jsx";

function Deudas({ debts }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  // --- 1. LÓGICA DE NOTIFICACIONES ---
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
    const dateFormatted = date.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 8);
    const title = encodeURIComponent(`Pago: ${debtName}`);
    const details = encodeURIComponent(`Monto: S/ ${amount.toFixed(2)}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dateFormatted}/${dateFormatted}`;
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const checkNotifications = () => {
      const newNotifications = [];
      debts.forEach(debt => {
        const validPayments = getValidPayments(debt);
        const nextUnpaid = validPayments.find(p => !p.paid);

        if (nextUnpaid) {
          const days = getDaysUntilDue(nextUnpaid.date);
          const exactMessage = `Pago de ${debt.name} (${debt.lender}): S/ ${nextUnpaid.amount.toFixed(2)}`;

          if (days === 0) {
            newNotifications.push({
              type: 'today',
              icon: '🚨',
              message: `¡HOY VENCE! ${exactMessage}`,
              calendarLink: createCalendarLink(debt.name, nextUnpaid.amount, nextUnpaid.date)
            });
          } else if ([7, 4, 1].includes(days)) {
            newNotifications.push({
              type: 'upcoming',
              icon: '📅',
              message: `Vence en ${days} días: ${exactMessage}`,
              calendarLink: createCalendarLink(debt.name, nextUnpaid.amount, nextUnpaid.date)
            });
          } else if (days < 0) {
             newNotifications.push({
              type: 'overdue',
              icon: '⚠️',
              message: `VENCIDO (${Math.abs(days)}d): ${exactMessage}`
            });
          }
        }
      });
      setNotifications(newNotifications);
    };

    checkNotifications();
  }, [debts]);

  // --- 2. AGRUPAR ENTIDADES (CORRECCIÓN MAYÚSCULAS/MINÚSCULAS) ---
  // Convertimos todo a mayúsculas para encontrar los nombres únicos (BCP = bcp)
  const uniqueEntitiesNormalized = [...new Set(debts.map(d => d.lender.toUpperCase().trim()))];

  return (
    <div className="flex-1 p-8 bg-gray-50 overflow-y-auto min-h-screen">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Cartera de Deudas</h2>
          <p className="text-gray-500 mt-1">Gestión por entidad financiera</p>
        </div>
        <NotificationCenter notifications={notifications} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uniqueEntitiesNormalized.length === 0 ? (
          <div className="col-span-3 text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-xl text-gray-500 font-medium">¡Estás libre de deudas!</p>
          </div>
        ) : (
          uniqueEntitiesNormalized.map(entityNormalized => {
            // Filtramos comparando en mayúsculas para que "BCP" y "bcp" entren aquí
            const relatedDebts = debts.filter(d => d.lender.toUpperCase().trim() === entityNormalized);

            // Usamos el nombre normalizado (MAYÚSCULAS) para el título de la tarjeta
            // Ejemplo: "BCP", "INTERBANK"
            const entityDisplayName = entityNormalized;

            // Cálculos Totales del Banco
            const totalAmount = relatedDebts.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
            
            let totalPaid = 0;
            let totalPending = 0;
            let hasOverdue = false;
            let hasUpcoming = false;

            relatedDebts.forEach(d => {
                const payments = getValidPayments(d);
                payments.forEach(p => {
                    if (p.paid) {
                        totalPaid += p.amount;
                    } else {
                        totalPending += p.amount;
                        const days = getDaysUntilDue(p.date);
                        if (days < 0) hasOverdue = true;
                        if (days >= 0 && days <= 7) hasUpcoming = true;
                    }
                });
            });

            const progress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

            // Semáforo de la Tarjeta Principal
            let cardBorder = "border-gray-200";
            let statusBadge = <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">Al día</span>;
            let progressBarColor = "bg-indigo-600";

            if (totalPending === 0) {
                cardBorder = "border-green-200 bg-green-50/20";
                statusBadge = <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">✅ Finalizado</span>;
                progressBarColor = "bg-green-500";
            } else if (hasOverdue) {
                cardBorder = "border-red-300 ring-1 ring-red-100 bg-red-50/10";
                statusBadge = <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">🚨 Atención</span>;
                progressBarColor = "bg-red-500";
            } else if (hasUpcoming) {
                cardBorder = "border-yellow-300 bg-yellow-50/10";
                statusBadge = <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">⚠️ Vence pronto</span>;
                progressBarColor = "bg-yellow-500";
            }

            return (
              <div
                key={entityNormalized}
                className={`bg-white p-5 rounded-xl shadow-sm border transition-all hover:shadow-lg ${cardBorder}`}
              >
                {/* Cabecera Tarjeta */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 p-2 rounded-lg text-xl">🏦</div>
                    {/* Mostramos el nombre en Mayúsculas siempre */}
                    <h3 className="text-lg font-bold text-gray-800">{entityDisplayName}</h3>
                  </div>
                  {statusBadge}
                </div>

                {/* Barra de Progreso Global */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progreso Total</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-1.5 rounded-full transition-all duration-1000 ${progressBarColor}`} style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                {/* LISTA DE DEUDAS INDIVIDUALES */}
                <div className="space-y-2">
                    {relatedDebts.map(debt => {
                        const debtPayments = getValidPayments(debt);
                        const nextPay = debtPayments.find(p => !p.paid);
                        const isDebtPaid = !nextPay;
                        
                        let miniStatus = "text-gray-500";
                        if (!isDebtPaid) {
                            const dDays = getDaysUntilDue(nextPay.date);
                            if (dDays < 0) miniStatus = "text-red-600 font-bold";
                            else if (dDays <= 7) miniStatus = "text-yellow-600 font-medium";
                        }

                        return (
                            <div 
                                key={debt.id}
                                onClick={() => navigate(`/deudas/${debt.id}`)}
                                className="group flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
                                        {debt.name}
                                    </span>
                                    <span className={`text-xs ${miniStatus}`}>
                                        {isDebtPaid 
                                            ? "Pagado" 
                                            : `Cuota: S/ ${nextPay.amount.toFixed(2)}`}
                                    </span>
                                </div>
                                <div className="text-gray-400 group-hover:translate-x-1 transition-transform">
                                    →
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Totales */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
                    <span className="text-gray-500">Deuda Total:</span>
                    <span className="font-bold text-gray-900">S/ {totalPending.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Deudas;