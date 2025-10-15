import React, { useState, useEffect } from "react";

function AddDebtModal({ isOpen, onClose, onAddDebt, editingDebt }) {
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

  // ✅ Cargar datos si se está modificando una deuda
  useEffect(() => {
    if (editingDebt) {
      setFormData({
        name: editingDebt.name || "",
        lender: editingDebt.lender || "",
        principal: editingDebt.principal?.toString() || "",
        interestRate: editingDebt.interestRate?.toString() || "",
        interestPeriod: editingDebt.interestPeriod || "monthly",
        installments: editingDebt.installments?.toString() || "",
        startDate: editingDebt.startDate || "",
      });

      setCalculatedData({
        totalAmount: editingDebt.totalAmount || 0,
        cuota: editingDebt.cuota || 0,
        totalInterest: editingDebt.totalInterest || 0,
      });
    } else {
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
    }
  }, [editingDebt, isOpen]);

  // ✅ Calcular automáticamente según el tipo de interés
  useEffect(() => {
    const { principal, interestRate, installments, interestPeriod } = formData;

    if (principal && interestRate && installments) {
      const P = parseFloat(principal);
      const rate = parseFloat(interestRate);
      const n = parseInt(installments);

      if (P > 0 && rate >= 0 && n > 0) {
        let totalAmount, cuota, totalInterest;

        switch (interestPeriod) {
          case "unique":
            totalInterest = (P * rate) / 100;
            totalAmount = P + totalInterest;
            cuota = totalAmount / n;
            break;

          case "monthly":
            const r_monthly = rate / 100;
            if (r_monthly === 0) {
              cuota = P / n;
              totalAmount = P;
              totalInterest = 0;
            } else {
              cuota =
                (P * (r_monthly * Math.pow(1 + r_monthly, n))) /
                (Math.pow(1 + r_monthly, n) - 1);
              totalAmount = cuota * n;
              totalInterest = totalAmount - P;
            }
            break;

          case "annual":
            const r_annual = rate / 100;
            const r_monthly_from_annual = Math.pow(1 + r_annual, 1 / 12) - 1;
            if (r_monthly_from_annual === 0) {
              cuota = P / n;
              totalAmount = P;
              totalInterest = 0;
            } else {
              cuota =
                (P *
                  (r_monthly_from_annual *
                    Math.pow(1 + r_monthly_from_annual, n))) /
                (Math.pow(1 + r_monthly_from_annual, n) - 1);
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
  }, [
    formData.principal,
    formData.interestRate,
    formData.installments,
    formData.interestPeriod,
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.lender ||
      !formData.principal ||
      !formData.interestRate ||
      !formData.installments ||
      !formData.startDate
    ) {
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

    if (editingDebt?.id) {
      onAddDebt({ ...debtData, id: editingDebt.id, isEdit: true });
    } else {
      onAddDebt(debtData);
    }

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
    onClose();
  };

  if (!isOpen) return null;

  const getInterestTypeDescription = () => {
    switch (formData.interestPeriod) {
      case "unique":
        return "💡 Se cobra una sola vez al inicio (Ej: Yape BCP)";
      case "monthly":
        return "💡 Se aplica cada mes sobre el saldo (Ej: Tarjetas de crédito)";
      case "annual":
        return "💡 TEA convertida a mensual (Ej: Préstamos bancarios)";
      default:
        return "";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-gray-800 mb-6">
          {editingDebt ? "Editar Deuda" : "Nueva Deuda"}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la deuda *
              </label>
              <input
                type="text"
                placeholder="Ej: Préstamo Yape"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entidad *
              </label>
              <input
                type="text"
                placeholder="Ej: BCP, Saga Falabella"
                value={formData.lender}
                onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Datos financieros */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">💰 Datos Financieros</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto principal (S/) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="300.00"
                  value={formData.principal}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || parseFloat(value) >= 0) {
                      setFormData({ ...formData, principal: value });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de cuotas *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="6"
                  value={formData.installments}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || parseInt(value) >= 1) {
                      setFormData({ ...formData, installments: value });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                />
              </div>
            </div>

            {/* Tipo de interés */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de interés *
              </label>
              <select
                value={formData.interestPeriod}
                onChange={(e) => setFormData({ ...formData, interestPeriod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="unique">Cargo único (Ej: Yape, préstamos express)</option>
                <option value="monthly">Interés mensual (Ej: Tarjeta de crédito)</option>
                <option value="annual">Interés anual - TEA (Ej: Préstamo bancario)</option>
              </select>
              <p className="text-xs text-blue-600 mt-1">{getInterestTypeDescription()}</p>
            </div>

            {/* Tasa de interés */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tasa de interés (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder={formData.interestPeriod === 'annual' ? '12.5' : '9.8'}
                value={formData.interestRate}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
                    setFormData({ ...formData, interestRate: value });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de primer pago *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Resumen calculado */}
          {calculatedData.totalAmount > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-3">📊 Resumen Calculado</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Cuota mensual</p>
                  <p className="text-xl font-bold text-green-700">
                    S/ {calculatedData.cuota.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Intereses totales</p>
                  <p className="text-xl font-bold text-orange-600">
                    S/ {calculatedData.totalInterest.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    ({((calculatedData.totalInterest / parseFloat(formData.principal || 1)) * 100).toFixed(2)}% del principal)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total a pagar</p>
                  <p className="text-xl font-bold text-indigo-700">
                    S/ {calculatedData.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-3 p-2 bg-white rounded border border-green-300">
                <p className="text-xs text-gray-700">
                  <strong>Ejemplo:</strong> Si pides S/ {formData.principal || '300'} con {formData.interestRate || '9.8'}% de interés 
                  {formData.interestPeriod === 'unique' && ' único'}
                  {formData.interestPeriod === 'monthly' && ' mensual'}
                  {formData.interestPeriod === 'annual' && ' anual'}
                  , pagarás {formData.installments || '6'} cuotas de S/ {calculatedData.cuota.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
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
              {editingDebt ? "Actualizar Deuda" : "Guardar Deuda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDebtModal;