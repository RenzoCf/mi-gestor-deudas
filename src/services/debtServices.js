import { supabase } from '../supabaseClient';

// --- FUNCIONES AUXILIARES ---

const addMonths = (date, months) => {
  const d = new Date(date);
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== originalDay) {
    d.setDate(0);
  }
  return d;
};

// Helper para redondear a 2 decimales
const round2 = (num) => Math.round(num * 100) / 100;

// Función para calcular tabla de amortización (CORREGIDA PARA REDONDEO EXACTO)
export const calculateAmortizationSchedule = (principal, annualRate, installments, interestPeriod) => {
  const schedule = [];
  
  // --- Caso: Interés Cero o Pago Único ---
  if (annualRate === 0 || interestPeriod === 'unique') {
    const capitalPorCuotaNoRedondeada = principal / installments;
    let interesPorCuotaNoRedondeada = 0;
    
    if (interestPeriod === 'unique' && annualRate > 0) {
      const totalInterest = (principal * annualRate) / 100;
      interesPorCuotaNoRedondeada = totalInterest / installments;
    }
    
    const cuotaMensualRedondeada = round2(capitalPorCuotaNoRedondeada + interesPorCuotaNoRedondeada);
    
    let totalPrincipalAcumulado = 0;
    
    for (let i = 0; i < installments; i++) {
      let capitalRedondeado = round2(capitalPorCuotaNoRedondeada);
      let interesRedondeado = cuotaMensualRedondeada - capitalRedondeado;
      
      // Ajuste de capital en la última cuota para asegurar el saldo cero
      if (i === installments - 1) {
          capitalRedondeado = round2(principal - totalPrincipalAcumulado);
          interesRedondeado = round2(cuotaMensualRedondeada - capitalRedondeado);
          // Forzar a que la cuota final sea igual a la cuota mensual, si el ajuste es pequeño.
          if (round2(capitalRedondeado + interesRedondeado) !== cuotaMensualRedondeada) {
              interesRedondeado = round2(cuotaMensualRedondeada - capitalRedondeado);
          }
      }
      
      totalPrincipalAcumulado = round2(totalPrincipalAcumulado + capitalRedondeado);

      schedule.push({
        cuota: i + 1,
        capital: round2(capitalRedondeado),
        interes: round2(interesRedondeado),
        cuotaMensual: cuotaMensualRedondeada,
        saldoInsoluto: round2(Math.max(0, principal - totalPrincipalAcumulado))
      });
    }
    return schedule;
  }
  
  // --- Caso: Amortización Francesa (Interés Mensual o Anual) ---
  let r_monthly;
  if (interestPeriod === 'monthly') {
    r_monthly = annualRate / 100;
  } else if (interestPeriod === 'annual') {
    const r_annual = annualRate / 100;
    r_monthly = Math.pow(1 + r_annual, 1 / 12) - 1;
  }
  
  const pow = Math.pow(1 + r_monthly, installments);
  const cuotaFijaNoRedondeada = (principal * (r_monthly * pow)) / (pow - 1);
  
  // 🔥 CORECCIÓN CLAVE: Redondear la cuota fija a 2 decimales
  const cuotaFija = round2(cuotaFijaNoRedondeada); 

  let saldoInsoluto = principal;
  let totalCapitalAcumulado = 0;

  for (let i = 0; i < installments; i++) {
    const interesMes = saldoInsoluto * r_monthly;
    
    // Redondeamos los componentes
    let interesRedondeado = round2(interesMes); 
    let capitalMes = cuotaFija - interesRedondeado;
    let capitalRedondeado = round2(capitalMes);
    
    // Ajuste de Cierre (Última Cuota): Forzar que el saldo quede en cero.
    if (i === installments - 1) {
      capitalRedondeado = round2(principal - totalCapitalAcumulado);
      // Recalculamos el interés de la última cuota para que Cuota-Capital = Interés
      interesRedondeado = round2(cuotaFija - capitalRedondeado);
      
      // Forzar a que la cuota final sea igual a la cuota fija (si el ajuste es muy pequeño)
      if (round2(capitalRedondeado + interesRedondeado) !== cuotaFija) {
          interesRedondeado = round2(cuotaFija - capitalRedondeado);
      }
    }
    
    // Asegurar que Capital + Interés = Cuota Fija (si no se hizo antes por el if)
    if (round2(capitalRedondeado + interesRedondeado) !== cuotaFija) {
        capitalRedondeado = round2(cuotaFija - interesRedondeado);
    }
    
    totalCapitalAcumulado = round2(totalCapitalAcumulado + capitalRedondeado);
    let saldoInsolutoAjustado = round2(Math.max(0, principal - totalCapitalAcumulado));

    // Aseguramos que el saldo final sea 0 en la última cuota
    if (i === installments - 1) {
        saldoInsolutoAjustado = 0;
    }
    
    schedule.push({
      cuota: i + 1,
      capital: capitalRedondeado,
      interes: interesRedondeado,
      cuotaMensual: cuotaFija,
      saldoInsoluto: saldoInsolutoAjustado
    });
    
    saldoInsoluto = saldoInsolutoAjustado;
  }
  return schedule;
};

// --- SERVICIOS DE BASE DE DATOS (MANTENIDO) ---

export const getUserDebts = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      await supabase.auth.signOut();
      window.location.href = '/auth';
      return { success: false, error: 'Sesión expirada' };
    }

    const { data: debts, error: debtsError } = await supabase
      .from('debts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

    if (debtsError) throw debtsError;

    const debtsWithPayments = await Promise.all(
      debts.map(async (debt) => {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments').select('*').eq('debt_id', debt.id).order('date', { ascending: true });

        if (paymentsError) throw paymentsError;

        const nextPayment = payments.find(p => !p.paid);
        const amortizationSchedule = calculateAmortizationSchedule(
          parseFloat(debt.principal), parseFloat(debt.interest_rate),
          debt.installments, debt.interest_period
        );
        
        return {
          id: debt.id,
          name: debt.name,
          lender: debt.lender,
          totalAmount: parseFloat(debt.total_amount),
          cuota: parseFloat(debt.cuota),
          installments: debt.installments,
          startDate: debt.start_date,
          status: debt.status,
          principal: parseFloat(debt.principal),
          interestRate: parseFloat(debt.interest_rate),
          totalInterest: parseFloat(debt.total_interest),
          interestPeriod: debt.interest_period,
          lateFee: parseFloat(debt.late_fee_percentage || 0),
          payments: payments.map(p => ({
            id: p.id, date: p.date, amount: parseFloat(p.amount),
            paid: p.paid, paidAt: p.paid_at, payment_method: p.payment_method, receipt_url: p.receipt_url
          })),
          nextPaymentDate: nextPayment?.date || null,
          amortizationSchedule 
        };
      })
    );
    return { success: true, data: debtsWithPayments };
  } catch (error) { return { success: false, error: error.message }; }
};

export const createDebt = async (debtData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const lateFeePercentage = parseFloat(debtData.lateFee || 0);

    const { data: newDebt, error: debtError } = await supabase
      .from('debts')
      .insert([{
        user_id: user.id, name: debtData.name, lender: debtData.lender,
        total_amount: debtData.totalAmount, cuota: debtData.cuota, installments: debtData.installments,
        start_date: debtData.startDate, status: 'PENDIENTE',
        principal: debtData.principal, interest_rate: debtData.interestRate,
        interest_period: debtData.interestPeriod, total_interest: debtData.totalInterest,
        late_fee_percentage: lateFeePercentage
      }])
      .select().single();

    if (debtError) throw debtError;

    const payments = [];
    for (let idx = 0; idx < debtData.installments; idx++) {
      // ✅ CORRECCIÓN: Cambiado de 'idx + 1' a 'idx'
      const date = addMonths(new Date(debtData.startDate + 'T00:00:00'), idx); 
      payments.push({
        debt_id: newDebt.id, date: date.toISOString().split('T')[0],
        amount: debtData.cuota, paid: false
      });
    }

    const { data: createdPayments, error: paymentsError } = await supabase
      .from('payments').insert(payments).select();

    if (paymentsError) throw paymentsError;

    // --- FIX: Mapear para el frontend ---
    const debtForFrontend = {
        ...newDebt,
        lateFee: newDebt.late_fee_percentage, // Mapeo crítico
        totalAmount: parseFloat(newDebt.total_amount),
        principal: parseFloat(newDebt.principal),
        interestRate: parseFloat(newDebt.interest_rate),
        startDate: newDebt.start_date
    };

    return { success: true, data: { ...debtForFrontend, payments: createdPayments } };
  } catch (error) { return { success: false, error: error.message }; }
};

export const uploadReceipt = async (file, userId) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage.from('comprobantes').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('comprobantes').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) { return null; }
};

export const markPaymentAsPaid = async (paymentId, method, receiptUrl = null) => {
  try {
    const { data, error } = await supabase.from('payments')
      .update({ paid: true, paid_at: new Date().toISOString(), payment_method: method, receipt_url: receiptUrl })
      .eq('id', paymentId).select().single();
    
    if (error) throw error;

    const { data: payment } = await supabase.from('payments').select('debt_id').eq('id', paymentId).single();
    if (payment) {
      const { data: allPayments } = await supabase.from('payments').select('paid').eq('debt_id', payment.debt_id);
      if (allPayments.every(p => p.paid)) {
        await supabase.from('debts').update({ status: 'PAGADO' }).eq('id', payment.debt_id);
      }
    }
    return { success: true, data };
  } catch (error) { return { success: false, error: error.message }; }
};

export const deleteDebt = async (debtId) => {
  try {
    const { error } = await supabase.from('debts').delete().eq('id', debtId);
    if (error) throw error;
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
};

export const updateDebtWithPayments = async (debtId, updates) => {
  try {
    const cuotaNumerica = parseFloat(updates.cuota);
    const installmentsNumerica = parseInt(updates.installments);
    const totalAmountNumerica = parseFloat(updates.totalAmount);
    const lateFeePercentage = parseFloat(updates.lateFee || 0);

    const { error: deleteError } = await supabase.from('payments').delete().eq('debt_id', debtId);
    if (deleteError) throw deleteError;
    
    const { data: updatedDebt, error: debtError } = await supabase
      .from('debts')
      .update({
        name: updates.name, lender: updates.lender, total_amount: totalAmountNumerica,
        cuota: cuotaNumerica, installments: installmentsNumerica, start_date: updates.startDate,
        principal: parseFloat(updates.principal || updates.totalAmount),
        interest_rate: parseFloat(updates.interestRate || 0),
        interest_period: updates.interestPeriod || 'unique',
        total_interest: parseFloat(updates.totalInterest || 0),
        late_fee_percentage: lateFeePercentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', debtId).select().single();

    if (debtError) throw debtError;

    const newPayments = [];
    for (let idx = 0; idx < installmentsNumerica; idx++) {
      // ✅ CORRECCIÓN: Cambiado de 'idx + 1' a 'idx'
      const date = addMonths(new Date(updates.startDate + 'T00:00:00'), idx); 
      newPayments.push({
        debt_id: debtId, date: date.toISOString().split('T')[0],
        amount: cuotaNumerica, paid: false, paid_at: null
      });
    }

    const { data: createdPayments, error: paymentsError } = await supabase
      .from('payments').insert(newPayments).select();

    if (paymentsError) throw paymentsError;

    // --- FIX: Mapear para el frontend ---
    const debtForFrontend = {
        ...updatedDebt,
        lateFee: updatedDebt.late_fee_percentage, // Mapeo crítico para que aparezca al guardar
        totalAmount: parseFloat(updatedDebt.total_amount),
        principal: parseFloat(updatedDebt.principal),
        interestRate: parseFloat(updatedDebt.interest_rate),
        startDate: updatedDebt.start_date,
        interestPeriod: updatedDebt.interest_period
    };

    return { success: true, data: { ...debtForFrontend, payments: createdPayments } };
  } catch (error) { return { success: false, error: error.message }; }
};

export const updateDebt = async (debtId, updates) => {
  try {
    const dbUpdates = { ...updates, updated_at: new Date().toISOString() };
    if (updates.lateFee !== undefined) {
      dbUpdates.late_fee_percentage = parseFloat(updates.lateFee || 0);
      delete dbUpdates.lateFee;
    }
    const { data, error } = await supabase.from('debts').update(dbUpdates).eq('id', debtId).select().single();
    if (error) throw error;
    
    // Fix para update simple también
    const debtForFrontend = {
        ...data,
        lateFee: data.late_fee_percentage,
        totalAmount: parseFloat(data.total_amount),
        principal: parseFloat(data.principal),
        interestRate: parseFloat(data.interest_rate),
    };
    
    return { success: true, data: debtForFrontend };
  } catch (error) { return { success: false, error: error.message }; }
};