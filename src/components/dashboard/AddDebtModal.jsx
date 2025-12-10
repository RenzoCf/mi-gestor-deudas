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
    lateFee: "", // <--- Nuevo estado para la mora
  });

  const [calculatedData, setCalculatedData] = useState({
    totalAmount: 0,
    cuota: 0,
    totalInterest: 0,
  });

  const [error, setError] = useState("");

  // --- EFECTOS DE CARGA Y LIMPIEZA ---
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        name: initialData.name || "",
        lender: initialData.lender || "",
        principal: (initialData.principal || "").toString(),
        interestRate: (initialData.interestRate || "").toString(),
        interestPeriod: initialData.interestPeriod || "monthly",
        installments: (initialData.installments || "").toString(),
        startDate: initialData.startDate || "",
        lateFee: (initialData.lateFee || "").toString(), // <--- Cargar mora al editar
      });
    }
  }, [isEditing, initialData]);

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
        lateFee: "", // <--- Limpiar mora
      });
      setCalculatedData({ totalAmount: 0, cuota: 0, totalInterest: 0 });
      setError("");
    }
  }, [isOpen, isEditing]);

  // --- CÁLCULOS EN TIEMPO REAL ---
  useEffect(() => {
    const principal = parseFloat(formData.principal || 0);
    const interestRate = parseFloat(formData.interestRate || 0);
    let installments = parseInt(formData.installments || 0);
    if (formData.interestPeriod === 'unique') installments = 1;

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
            cuota = totalAmount; 
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
            totalAmount = 0; cuota = 0; totalInterest = 0;
        }
      }

      setCalculatedData({
        totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
        cuota: isNaN(cuota) ? 0 : cuota,
        totalInterest: isNaN(totalInterest) ? 0 : totalInterest,
      });
    } else {
      setCalculatedData({ totalAmount: 0, cuota: 0, totalInterest: 0 });
    }
  }, [formData.principal, formData.interestRate, formData.installments, formData.interestPeriod]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.lender || !formData.principal || !formData.startDate) {
      setError("Completa los campos obligatorios (*)");
      return;
    }
    
    if (formData.interestPeriod !== 'unique' && !formData.installments) {
        setError("Indica el número de cuotas");
        return;
    }

    const principal = parseFloat(formData.principal);
    const installments = formData.interestPeriod === 'unique' ? 1 : parseInt(formData.installments);
    const interestRate = parseFloat(formData.interestRate || 0);
    const lateFee = parseFloat(formData.lateFee || 0); // <--- Capturar mora

    if (principal <= 0) { setError("El monto debe ser positivo"); return; }
    if (installments <= 0) { setError("Cuotas inválidas"); return; }

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
      lateFee: lateFee, // <--- Enviar mora al padre
    };

    onAddDebt(debtData);
    if (!isEditing) {
      // Reset completo
      setFormData({ name: "", lender: "", principal: "", interestRate: "", interestPeriod: "monthly", installments: "", startDate: "", lateFee: "" });
      setCalculatedData({ totalAmount: 0, cuota: 0, totalInterest: 0 });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 flex justify-center items-center p-4 backdrop-blur-sm transition-opacity duration-300">
      
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative transform transition-all scale-100 animate-fade-in-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <span className="text-lg">📝</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold tracking-tight leading-none">
                        {isEditing ? "Editar Préstamo" : "Nueva Deuda"}
                    </h3>
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider mt-0.5">Gestión Financiera</p>
                </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-full transition-colors">
                <svg className="w-5 h-5 text-slate-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* CUERPO EN GRILLA */}
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row h-full">
            
            {/* COLUMNA IZQUIERDA: DATOS BÁSICOS */}
            <div className="flex-1 p-6 space-y-5 border-r border-slate-100">
                {error && (
                    <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs font-bold border border-red-100 flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nombre Referencial</label>
                        <input
                            type="text" placeholder="Ej: Préstamo Coche" autoFocus
                            value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-semibold text-slate-700 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Entidad / Banco</label>
                        <input
                            type="text" placeholder="Ej: BCP"
                            value={formData.lender} onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-semibold text-slate-700 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
                            {formData.interestPeriod === 'unique' ? 'Fecha de Vencimiento' : 'Fecha Primer Pago'}
                        </label>
                        <input
                            type="date"
                            value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA: CALCULADORA */}
            <div className="flex-1 p-6 bg-indigo-50/30 flex flex-col justify-between">
                
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1 ml-1">Monto Principal</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-indigo-400 font-bold">S/</span>
                                <input
                                    type="number" step="0.01" min="0.01" placeholder="0.00"
                                    value={formData.principal} onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 text-lg font-bold text-slate-800 placeholder-slate-300 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1 ml-1">Tipo Interés</label>
                            <select
                                value={formData.interestPeriod}
                                onChange={(e) => setFormData({ ...formData, interestPeriod: e.target.value })}
                                className="w-full px-2 py-2.5 bg-white border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-600 outline-none"
                            >
                                <option value="unique">Único (Flat)</option>
                                <option value="monthly">Mensual</option>
                                <option value="annual">Anual (TEA)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1 ml-1">Tasa Interés (%)</label>
                            <input
                                type="number" step="0.01" min="0" max="100" placeholder="0%"
                                value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                                className="w-full px-3 py-2.5 bg-white border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right font-bold text-sm text-slate-700 outline-none"
                            />
                        </div>
                    </div>

                    {/* --- AQUÍ ESTÁ EL CAMPO NUEVO DE MORA --- */}
                    <div>
                        <label className="block text-[10px] font-bold text-red-500 uppercase mb-1 ml-1">Mora por Retraso (%)</label>
                        <div className="relative">
                            <input
                                type="number" step="0.1" min="0" placeholder="0%"
                                value={formData.lateFee} onChange={(e) => setFormData({ ...formData, lateFee: e.target.value })}
                                className="w-full px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg focus:ring-2 focus:ring-red-500 text-slate-700 outline-none font-bold placeholder-red-200"
                            />
                            <span className="absolute right-3 top-2.5 text-red-300 text-xs font-bold">% sobre cuota</span>
                        </div>
                        <p className="text-[9px] text-red-400 mt-1 ml-1">* Se aplicará si la fecha vence y no se ha pagado.</p>
                    </div>

                    {formData.interestPeriod !== 'unique' && (
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1 ml-1">Cuotas</label>
                            <div className="flex items-center bg-white border border-indigo-100 rounded-lg overflow-hidden">
                                <button type="button" onClick={() => setFormData(p => ({...p, installments: Math.max(1, (parseInt(p.installments)||0)-1)}))} className="px-3 py-2.5 hover:bg-indigo-50 text-indigo-600 font-bold">-</button>
                                <input
                                    type="number" min="1" placeholder="12"
                                    value={formData.installments} onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                                    className="w-full py-2.5 text-center outline-none font-bold text-slate-700 text-sm"
                                />
                                <button type="button" onClick={() => setFormData(p => ({...p, installments: (parseInt(p.installments)||0)+1}))} className="px-3 py-2.5 hover:bg-indigo-50 text-indigo-600 font-bold">+</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RESUMEN FINAL */}
                <div className="mt-6 pt-4 border-t border-indigo-200">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs text-slate-500 font-medium">Cuota Estimada</span>
                        <span className="text-lg font-bold text-slate-800">S/ {calculatedData.cuota.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500 font-medium">Total Final</span>
                        <span className="text-sm font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">S/ {calculatedData.totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                {/* BOTONES ACCIÓN */}
                <div className="flex gap-3 mt-5">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg text-xs hover:bg-slate-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transform active:scale-95 transition text-xs uppercase tracking-wide">
                        {isEditing ? "Guardar Cambios" : "Crear Deuda"}
                    </button>
                </div>

            </div>
        </form>
      </div>
    </div>
  );
}

export default AddDebtModal;