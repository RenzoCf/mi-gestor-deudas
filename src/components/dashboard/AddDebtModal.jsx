// src/components/dashboard/AddDebtModal.jsx
import React, { useState, useEffect } from "react";

function AddDebtModal({ isOpen, onClose, onAddDebt }) {
  const [formData, setFormData] = useState({
    name: "",
    lender: "",
    principal: "",
    interestRate: "",
    interestPeriod: "monthly",
    installments: "",
    startDate: "",
  });

  const [calculatedData, setCalculatedData] = useState({
    totalAmount: 0,
    cuota: 0,
    totalInterest: 0,
  });

  // ✅ Calcular automáticamente según tipo de interés
  useEffect(() => {
    const { principal, interestRate, installments, interestPeriod } = formData;

    if (principal && interestRate && installments) {
      const P = parseFloat(principal);
      const rate = parseFloat(interestRate);
      const n = parseInt(installments);

      if (P > 0 && rate >= 0 && n > 0) {
        let totalAmount, cuota, totalInterest;

        switch (interestPeriod) {
          case 'unique':
            totalInterest = (P * rate) / 100;
            totalAmount = P + totalInterest;
            cuota = totalAmount / n;
            break;

          case 'monthly':
            const r_monthly = rate / 100;
            if (r_monthly === 0) {
              cuota = P / n;
              totalAmount = P;
              totalInterest = 0;
            } else {
              cuota = P * (r_monthly * Math.pow(1 + r_monthly, n)) / (Math.pow(1 + r_monthly, n) - 1);
              totalAmount = cuota * n;
              totalInterest = totalAmount - P;
            }
            break;

          case 'annual':
            const r_annual = rate / 100;
            const r_monthly_from_annual = Math.pow(1 + r_annual, 1 / 12) - 1;
            if (r_monthly_from_annual === 0) {
              cuota = P / n;
              totalAmount = P;
              totalInterest = 0;
            } else {
              cuota = P * (r_monthly_from_annual * Math.pow(1 + r_monthly_from_annual, n)) / (Math.pow(1 + r_monthly_from_annual, n) - 1);
              totalAmount = cuota * n;
              totalInterest = totalAmount - P;
            }
            break;

          default:
            totalAmount = 0;
            cuota = 0;
            totalInterest = 0;
        }

        setCalculatedData({
          totalAmount: totalAmount || 0,
          cuota: cuota || 0,
          totalInterest: totalInterest || 0,
        });
      } else {
        setCalculatedData({ totalAmount: 0, cuota: 0, totalInterest: 0 });
      }
    } else {
      setCalculatedData({ totalAmount: 0, cuota: 0, totalInterest: 0 });
    }
  }, [formData.principal, formData.interestRate, formData.installments, formData.interestPeriod]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.lender || !formData.principal ||
        !formData.interestRate || !formData.installments || !formData.startDate) {
      alert("Por favor completa todos los campos");
      return;
    }

    const debtData = {
      name: formData.name,
      lender: formData.lender,
      totalAmount: calculatedData.totalAmount,
      cuota: calculatedData.cuota,
      installments: parseInt(formData.installments),
      startDate: formData.startDate,
      principal: parseFloat(formData.principal),
      interestRate: parseFloat(formData.interestRate),
      interestPeriod: formData.interestPeriod,
      totalInterest: calculatedData.totalInterest,
    };

    onAddDebt(debtData);

    setFormData({
      name: "",
      lender: "",
      principal: "",
      interestRate: "",
      interestPeriod: "monthly",
      installments: "",
      startDate: "",
    });
    setCalculatedData({ totalAmount: 0, cuota: 0, totalInterest: 0 });
  };

  if (!isOpen) return null;

  const getInterestTypeDescription = () => {
    switch (formData.interestPeriod) {
      case 'unique': return '💡 Se cobra una sola vez al inicio (Ej: Yape BCP)';
      case 'monthly': return '💡 Se aplica cada mes sobre el saldo (Ej: Tarjetas de crédito)';
      case 'annual': return '💡 TEA convertida a mensual (Ej: Préstamos bancarios)';
      default: return '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Nueva Deuda</h3>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Información básica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la deuda *</label>
              <input
                type="text"
                placeholder="Ej: Préstamo Yape"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entidad *</label>
              <input
                type="text"
                placeholder="Ej: BCP, Saga Falabella"
                value={formData.lender}
                onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Datos financieros */}
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 sm:mb-3">💰 Datos Financieros</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto principal (S/) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="300.00"
                  value={formData.principal}
                  onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                  className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de cuotas *</label>
                <input
                  type="number"
                  placeholder="6"
                  value={formData.installments}
                  onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                  className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Tipo de interés */}
            <div className="mb-3 sm:mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de interés *</label>
              <select
                value={formData.interestPeriod}
                onChange={(e) => setFormData({ ...formData, interestPeriod: e.target.value })}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="unique">Cargo único (Ej: Yape, préstamos express)</option>
                <option value="monthly">Interés mensual (Ej: Tarjeta de crédito)</option>
                <option value="annual">Interés anual - TEA (Ej: Préstamo bancario)</option>
              </select>
              <p className="text-xs text-blue-600 mt-1">{getInterestTypeDescription()}</p>
            </div>

            {/* Tasa de interés */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de interés (%) *</label>
              <input
                type="number"
                step="0.01"
                placeholder={formData.interestPeriod === 'annual' ? '12.5' : '9.8'}
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.interestPeriod === 'unique' && 'Porcentaje que se cobrará una sola vez'}
                {formData.interestPeriod === 'monthly' && 'Tasa mensual (TEM)'}
                {formData.interestPeriod === 'annual' && 'Tasa efectiva anual (TEA)'}
              </p>
            </div>
          </div>

          {/* Fecha de inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de primer pago *</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Resumen calculado */}
          {calculatedData.totalAmount > 0 && (
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2 sm:mb-3">📊 Resumen Calculado</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <p className="text-sm text-gray-600">Cuota mensual</p>
                  <p className="text-lg sm:text-xl font-bold text-green-700">S/ {calculatedData.cuota.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Intereses totales</p>
                  <p className="text-lg sm:text-xl font-bold text-orange-600">S/ {calculatedData.totalInterest.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    ({((calculatedData.totalInterest / parseFloat(formData.principal || 1)) * 100).toFixed(2)}% del principal)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total a pagar</p>
                  <p className="text-lg sm:text-xl font-bold text-indigo-700">S/ {calculatedData.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold transition"
            >
              Guardar Deuda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDebtModal;
