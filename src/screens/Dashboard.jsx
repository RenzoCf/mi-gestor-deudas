import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MonthNavigator from "../components/dashboard/MonthNavigator.jsx";
import SummaryCards from "../components/dashboard/SummaryCards.jsx";
import AddDebtModal from "../components/dashboard/AddDebtModal.jsx";

function Dashboard({ debts = [], onAddDebt, handleLogout, onMarkAsPaid }) {
  const [activeView, setActiveView] = useState("Este Mes");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpcomingModalOpen, setIsUpcomingModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [urgentPayments, setUrgentPayments] = useState([]);
  const [showPaidDebts, setShowPaidDebts] = useState(false); // ✅ NUEVO ESTADO

  const navigate = useNavigate();

  // ✅ Función para calcular días hasta el vencimiento
  const getDaysUntilDue = (paymentDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(paymentDate + "T00:00:00");
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // ✅ Verificar pagos urgentes al cargar
  useEffect(() => {
    const checkUrgentPayments = async () => {
      const urgent = [];

      debts.forEach((debt) => {
        const nextPayment = debt.payments?.find((p) => !p.paid);
        if (nextPayment) {
          const daysUntilDue = getDaysUntilDue(nextPayment.date);
          if (daysUntilDue <= 5 && daysUntilDue >= 0) {
            urgent.push({
              debtId: debt.id,
              debtName: debt.name,
              lender: debt.lender,
              amount: nextPayment.amount,
              dueDate: nextPayment.date,
              daysLeft: daysUntilDue,
              paymentId: nextPayment.id,
            });
          }
        }
      });

      if (urgent.length > 0) {
        setUrgentPayments(urgent);

        const lastShown = localStorage.getItem("lastWarningShown");
        const today = new Date().toDateString();

        if (lastShown !== today) {
          setIsWarningModalOpen(true);
          localStorage.setItem("lastWarningShown", today);
        }
      }
    };

    if (debts.length > 0) {
      checkUrgentPayments();
    }
  }, [debts]);

  const summaryData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthOffset = activeView === "Este Mes" ? 0 : 1;
    const targetDate = new Date(
      today.getFullYear(),
      today.getMonth() + monthOffset,
      1
    );
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();

    let totalToPayInView = 0;
    let pendingInstallmentsInView = 0;
    const upcomingList = [];
    const in10Days = new Date(today);
    in10Days.setDate(today.getDate() + 10);

    debts.forEach((debt) => {
      debt.payments?.forEach((p) => {
        if (p.paid) return;

        const paymentDate = new Date(p.date + "T00:00:00");
        paymentDate.setHours(0, 0, 0, 0);

        if (
          paymentDate.getFullYear() === targetYear &&
          paymentDate.getMonth() === targetMonth
        ) {
          totalToPayInView += p.amount;
          pendingInstallmentsInView++;
        }

        if (paymentDate >= today && paymentDate <= in10Days) {
          upcomingList.push({
            ...debt,
            nextPaymentDate: paymentDate,
            paymentId: p.id,
          });
        }
      });
    });

    return {
      totalToPay: totalToPayInView.toFixed(2),
      pendingInstallments: pendingInstallmentsInView,
      upcomingPaymentsCount: upcomingList.length,
      upcomingList,
    };
  }, [debts, activeView]);

  const handleRowClick = (debtId) => navigate(`/deudas/${debtId}`);
  const handleUpcomingClick = () => setIsUpcomingModalOpen(true);
  const handleMarkAsPaidClick = (debtId, paymentId) => {
    onMarkAsPaid(debtId, paymentId);
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Panel de Control</h2>
      </header>

      <MonthNavigator
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <SummaryCards
        summaryData={summaryData}
        onUpcomingClick={handleUpcomingClick}
      />

      <section className="mt-10">
        {/* ✅ Encabezado con botón de filtro */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-700">
            {showPaidDebts ? "Deudas Pagadas" : "Mis Deudas"}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPaidDebts(!showPaidDebts)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-semibold"
            >
              {showPaidDebts ? "Ver deudas activas" : "Ver deudas pagadas"}
            </button>
            {!showPaidDebts && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
              >
                + Nueva Deuda
              </button>
            )}
          </div>
        </div>

        {/* ✅ Tabla filtrada */}
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="w-full bg-white">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-3 px-4 text-left">Nombre</th>
                <th className="py-3 px-4 text-left">Entidad</th>
                <th className="py-3 px-4 text-center">Cuota (S/)</th>
                <th className="py-3 px-4 text-center">Próximo Pago</th>
                <th className="py-3 px-4 text-center">Días restantes</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {debts
                .filter((debt) => {
                  const allPaid =
                    debt.payments?.length > 0 &&
                    debt.payments.every((p) => p.paid);
                  return showPaidDebts ? allPaid : !allPaid;
                })
                .map((debt) => {
                  const nextPaymentObj = debt.payments?.find((p) => !p.paid);
                  const nextPaymentStr = nextPaymentObj?.date
                    ? new Date(
                        nextPaymentObj.date + "T00:00:00"
                      ).toLocaleDateString("es-PE")
                    : "-";
                  const cuotaAmount = nextPaymentObj?.amount || debt.cuota || 0;

                  const daysUntilDue = nextPaymentObj?.date
                    ? getDaysUntilDue(nextPaymentObj.date)
                    : null;

                  const isUrgent =
                    daysUntilDue !== null &&
                    daysUntilDue <= 5 &&
                    daysUntilDue >= 0;
                  const isOverdue =
                    daysUntilDue !== null && daysUntilDue < 0;

                  return (
                    <tr
                      key={debt.id}
                      className={`border-t cursor-pointer transition ${
                        isOverdue
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : isUrgent
                          ? "bg-red-100 hover:bg-red-200 border-l-4 border-red-500"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleRowClick(debt.id)}
                    >
                      <td
                        className={`py-3 px-4 font-semibold ${
                          isUrgent || isOverdue ? "text-red-900" : ""
                        }`}
                      >
                        {debt.name}
                        {isUrgent && (
                          <span className="ml-2 text-red-600 animate-pulse">
                            ⚠️
                          </span>
                        )}
                        {isOverdue && (
                          <span className="ml-2 text-white animate-pulse">
                            🚨
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 ${
                          isOverdue ? "text-white" : ""
                        }`}
                      >
                        {debt.lender}
                      </td>
                      <td
                        className={`py-3 px-4 text-center font-semibold ${
                          isOverdue ? "text-white" : ""
                        }`}
                      >
                        S/ {cuotaAmount.toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-4 text-center ${
                          isOverdue ? "text-white" : ""
                        }`}
                      >
                        {nextPaymentStr}
                      </td>
                      <td
                        className={`py-3 px-4 text-center font-bold ${
                          isOverdue
                            ? "text-white"
                            : isUrgent
                            ? "text-red-600"
                            : daysUntilDue !== null &&
                              daysUntilDue <= 10
                            ? "text-yellow-600"
                            : "text-gray-600"
                        }`}
                      >
                        {daysUntilDue !== null
                          ? isOverdue
                            ? `${Math.abs(daysUntilDue)} día(s) VENCIDO`
                            : `${daysUntilDue} día(s)`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            isOverdue
                              ? "bg-white text-red-600"
                              : debt.status === "PENDIENTE"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {isOverdue ? "VENCIDO" : debt.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Nueva Deuda */}
      <AddDebtModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDebt={(debt) => {
          onAddDebt(debt);
          setIsAddModalOpen(false);
        }}
      />
    </div>
  );
}

export default Dashboard;
