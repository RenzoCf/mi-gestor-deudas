import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MonthNavigator from "../components/dashboard/MonthNavigator.jsx";
import SummaryCards from "../components/dashboard/SummaryCards.jsx";
import AddDebtModal from "../components/dashboard/AddDebtModal.jsx";

function Dashboard({ debts = [], onAddDebt, onUpdateDebt, handleLogout, onMarkAsPaid }) {
  const [activeView, setActiveView] = useState("Este Mes");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [isUpcomingModalOpen, setIsUpcomingModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [urgentPayments, setUrgentPayments] = useState([]);
  const [showPaidDebts, setShowPaidDebts] = useState(false);

  const navigate = useNavigate();

  const getDaysUntilDue = (paymentDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(paymentDate + "T00:00:00");
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 🔥 FUNCIÓN PARA FILTRAR SOLO PAGOS VÁLIDOS (igual que en DebtDetail)
  const getValidPayments = (debt) => {
    if (!debt.payments || debt.payments.length === 0) return [];
    
    // Filtrar pagos que coincidan con la cuota actual (tolerancia de 0.01)
    return debt.payments.filter(p => 
      Math.abs(p.amount - debt.cuota) < 0.01
    );
  };

  useEffect(() => {
    const checkUrgentPayments = async () => {
      const urgent = [];

      debts.forEach((debt) => {
        // 🔥 Usar pagos válidos
        const validPayments = getValidPayments(debt);
        const nextPayment = validPayments.find((p) => !p.paid);
        
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
      // 🔥 Usar solo pagos válidos
      const validPayments = getValidPayments(debt);
      
      validPayments.forEach((p) => {
        if (p.paid) return;

        const paymentDate = new Date(p.date + "T00:00:00");
        paymentDate.setHours(0, 0, 0, 0);

        if (
          paymentDate.getFullYear() === targetYear &&
          paymentDate.getMonth() === targetMonth
        ) {
          // ✅ Usar el monto del pago válido
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
  const handleMarkAsPaidClick = (debtId, paymentId) => onMarkAsPaid(debtId, paymentId);

  const handleOpenNewDebt = () => {
    setEditingDebt(null);
    setIsAddModalOpen(true);
  };

  const handleEditDebt = (debt) => {
    setEditingDebt(debt);
    setIsAddModalOpen(true);
  };

  const handleSaveDebt = async (debtData) => {
    if (editingDebt) {
      // 🔁 Modo edición - pasamos el ID y los datos
      await onUpdateDebt(editingDebt.id, debtData);
    } else {
      // ➕ Modo nuevo
      await onAddDebt(debtData);
    }
    setEditingDebt(null);
    setIsAddModalOpen(false);
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Panel de Control</h2>
      </header>

      <MonthNavigator activeView={activeView} onViewChange={setActiveView} />
      <SummaryCards summaryData={summaryData} onUpcomingClick={handleUpcomingClick} />

      <section className="mt-10">
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
                onClick={handleOpenNewDebt}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
              >
                + Nueva Deuda
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
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
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {debts
                .filter((debt) => {
                  // 🔥 Usar pagos válidos para determinar si está pagada
                  const validPayments = getValidPayments(debt);
                  const allPaid = validPayments.length > 0 && validPayments.every((p) => p.paid);
                  return showPaidDebts ? allPaid : !allPaid;
                })
                .map((debt) => {
                  // 🔥 Usar pagos válidos
                  const validPayments = getValidPayments(debt);
                  const nextPaymentObj = validPayments.find((p) => !p.paid);
                  
                  const nextPaymentStr = nextPaymentObj?.date
                    ? new Date(nextPaymentObj.date + "T00:00:00").toLocaleDateString("es-PE")
                    : "-";
                  
                  // ✅ Usar el monto del próximo pago válido, o la cuota de la deuda
                  const cuotaAmount = nextPaymentObj?.amount || debt.cuota || 0;

                  const daysUntilDue = nextPaymentObj?.date
                    ? getDaysUntilDue(nextPaymentObj.date)
                    : null;

                  const isUrgent = daysUntilDue !== null && daysUntilDue <= 5 && daysUntilDue >= 0;
                  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

                  return (
                    <tr
                      key={debt.id}
                      className={`border-t transition ${
                        isOverdue
                          ? "bg-red-600 text-white"
                          : isUrgent
                          ? "bg-red-100 border-l-4 border-red-500"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold">
                        {debt.name}
                        {isUrgent && <span className="ml-2 text-red-600 animate-pulse">⚠️</span>}
                        {isOverdue && <span className="ml-2 animate-pulse">🚨</span>}
                      </td>
                      <td className="py-3 px-4">{debt.lender}</td>
                      <td className="py-3 px-4 text-center font-semibold">
                        S/ {cuotaAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">{nextPaymentStr}</td>
                      <td className="py-3 px-4 text-center font-bold">
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
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDebt(debt);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          ✏️ Modificar
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal */}
      <AddDebtModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDebt(null);
        }}
        onAddDebt={handleSaveDebt}
        initialData={editingDebt}
        isEditing={!!editingDebt}
      />
    </div>
  );
}

export default Dashboard;