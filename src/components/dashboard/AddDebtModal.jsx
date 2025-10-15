import React, { useState, useEffect } from "react";

function AddDebtModal({ isOpen, onClose, onAddDebt, initialData, isEditing }) {
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

  const [error, setError] = useState("");

  // ✅ PRECARGA DATOS AL ABRIR EN MODO EDICIÓN - SOLO UNA VEZ
  useEffect(() => {
    if (isEditing && initialData) {
      console.log("📝 Precargando datos para edición:", initialData);
      
      const newFormData = {
        name: initialData.name || "",
        lender: initialData.lender || "",
        principal: (initialData.principal || "").toString(),
        interestRate: (initialData.interestRate || "").toString(),
        interestPeriod: initialData.interestPeriod || "monthly",
        installments: (initialData.installments || "").toString(),
        startDate: initialData.startDate || "",
      };
      
      setFormData(newFormData);
      setCalculatedData({
        totalAmount: initialData.totalAmount || 0,
        cuota: initialData.cuota || 0,
        totalInterest: initialData.totalInterest || 0,
      });
    }
  }, [isEditing, initialData?.id]);

  // ✅ NUEVA DEUDA - LIMPIAR
  useEffect(() => {
    if (isOpen && !isEditing) {
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
      setError("");
    }
  }, [isOpen, isEditing]);

  // ✅ CALCULAR cuando cambien los valores
  useEffect(() => {
    const principal = parseFloat(formData.principal || 0);
    const interestRate = parseFloat(formData.interestRate || 0);
    const installments = parseInt(formData.installments || 0);

    if (principal > 0 && installments > 0) {
      let totalAmount, cuota, totalInterest;

      if (interestRate === 0) {
        cuota = principal / installments;
        totalAmount = principal;
        totalInterest = 0;
      } else {
        switch (formData.interestPeriod) {
          case "unique":
            totalInterest = (principal * interestRate) / 100;
            totalAmount = principal + totalInterest;
            cuota = totalAmount / installments;
            break;

          case "monthly":
            const r_monthly = interestRate / 100;
            const pow = Math.pow(1 + r_monthly, installments);
            cuota = (principal * (r_monthly * pow)) / (pow - 1);
            totalAmount = cuota * installments;
            totalInterest = totalAmount - principal;
            break;

          case "annual":
            const r_annual = interestRate / 100;
            const r_monthly_from_annual = Math.pow(1 + r_annual, 1 / 12) - 1;
            const pow2 = Math.pow(1 + r_monthly_from_annual, installments);
            cuota = (principal * (r_monthly_from_annual * pow2)) / (pow2 - 1);
            totalAmount = cuota * installments;
            totalInterest = totalAmount - principal;
            break;

          default:
            totalAmount = 0;
            cuota = 0;
            totalInterest = 0;
        }
      }

      console.log("📊 Calculado:", { cuota, totalAmount, totalInterest });

      setCalculatedData({
        totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
        cuota: isNaN(cuota) ? 0 : cuota,
        totalInterest: isNaN(totalInterest) ? 0 : totalInterest,
      });
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
    setError("");

    // Validar campos requeridos
    if (
      !formData.name ||
      !formData.lender ||
      !formData.principal ||
      !formData.installments ||
      !formData.startDate
    ) {
      setError("Por favor completa todos los campos requeridos");
      return;
    }

    const principal = parseFloat(formData.principal);
    const installments = parseInt(formData.installments);
    const interestRate = parseFloat(formData.interestRate || 0);

    // ✅ Validación de NO negativos
    if (principal <= 0) {
      setError("El monto principal debe ser mayor a 0");
      return;
    }

    if (installments <= 0) {
      setError("El número de cuotas debe ser mayor a 0");
      return;
    }

    if (interestRate < 0) {
      setError("La tasa de interés no puede ser negativa");
      return;
    }

    const debtData = {
      name: formData.name.trim(),
      lender: formData.lender.trim(),
      totalAmount: Math.round(calculatedData.totalAmount * 100) / 100,
      cuota: Math.round(calculatedData.cuota * 100) / 100,
      installments: installments,
      startDate: formData.startDate,
      principal: principal,
      interestRate: interestRate,
      interestPeriod: formData.interestPeriod,
      totalInterest: Math.round(calculatedData.totalInterest * 100) / 100,
    };

    console.log("💾 Guardando deuda con datos finales:", debtData);

    onAddDebt(debtData);

    if (!isEditing) {
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

    setError("");
    onClose();
  };

  if (!isOpen) return null;

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
          {isEditing ? "✏️ Editar Deuda" : "➕ Nueva Deuda"}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
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
                  min="0.01"
                  placeholder="300.00"
                  value={formData.principal}
                  onChange={(e) => {
                    const value = e.target.value;
                    // ✅ Solo permitir números positivos o vacío
                    if (value === "" || parseFloat(value) >= 0) {
                      setFormData({ ...formData, principal: value });
                    }
                  }}
                  onKeyDown={(e) => {
                    // ✅ Bloquear tecla de signo negativo
                    if (e.key === "-" || e.key === "e" || e.key === "E") {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    // ✅ Solo permitir números enteros positivos o vacío
                    if (value === "" || (parseInt(value) >= 1 && !value.includes("."))) {
                      setFormData({ ...formData, installments: value });
                    }
                  }}
                  onKeyDown={(e) => {
                    // ✅ Bloquear signos negativos y decimales
                    if (e.key === "-" || e.key === "." || e.key === "," || e.key === "e" || e.key === "E") {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tasa de interés (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="9.8"
                value={formData.interestRate}
                onChange={(e) => {
                  const value = e.target.value;
                  // ✅ Solo permitir 0-100 o vacío
                  if (value === "" || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
                    setFormData({ ...formData, interestRate: value });
                  }
                }}
                onKeyDown={(e) => {
                  // ✅ Bloquear signo negativo
                  if (e.key === "-" || e.key === "e" || e.key === "E") {
                    e.preventDefault();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">💡 Deja en 0 si no tiene intereses</p>
            </div>
          </div>

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
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total a pagar</p>
                  <p className="text-xl font-bold text-indigo-700">
                    S/ {calculatedData.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              {isEditing ? "✏️ Actualizar Deuda" : "➕ Guardar Deuda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDebtModal;