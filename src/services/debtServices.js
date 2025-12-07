import { supabase } from '../supabaseClient';

// --- FUNCIONES AUXILIARES ---

// Función para sumar meses correctamente (ej: 31 Ene + 1 mes = 28 Feb)
const addMonths = (date, months) => {
  const d = new Date(date);
  const originalDay = d.getDate();
  
  d.setMonth(d.getMonth() + months);
  
  // Ajustar si el día resultante no existe en el nuevo mes
  if (d.getDate() !== originalDay) {
    d.setDate(0);
  }
  
  return d;
};

// Función para calcular tabla de amortización (Sistema Francés)
export const calculateAmortizationSchedule = (principal, annualRate, installments, interestPeriod) => {
  const schedule = [];
  
  // Sin interés o interés único: amortización simple
  if (annualRate === 0 || interestPeriod === 'unique') {
    const capitalPorCuota = principal / installments;
    let interesPorCuota = 0;
    
    if (interestPeriod === 'unique' && annualRate > 0) {
      const totalInterest = (principal * annualRate) / 100;
      interesPorCuota = totalInterest / installments;
    }
    
    for (let i = 0; i < installments; i++) {
      schedule.push({
        cuota: i + 1,
        capital: capitalPorCuota,
        interes: interesPorCuota,
        cuotaMensual: capitalPorCuota + interesPorCuota,
        saldoInsoluto: principal - (capitalPorCuota * (i + 1))
      });
    }
    return schedule;
  }
  
  // CON INTERÉS MENSUAL O ANUAL: Sistema Francés
  let r_monthly;
  
  if (interestPeriod === 'monthly') {
    r_monthly = annualRate / 100;
  } else if (interestPeriod === 'annual') {
    // Convertir TEA a TEM
    const r_annual = annualRate / 100;
    r_monthly = Math.pow(1 + r_annual, 1 / 12) - 1;
  }
  
  // Calcular cuota fija usando fórmula francesa
  const pow = Math.pow(1 + r_monthly, installments);
  const cuotaFija = (principal * (r_monthly * pow)) / (pow - 1);
  
  let saldoInsoluto = principal;
  
  for (let i = 0; i < installments; i++) {
    // Interés del mes = saldo insoluto × tasa mensual
    const interesMes = saldoInsoluto * r_monthly;
    
    // Capital amortizado = cuota fija - interés del mes
    const capitalMes = cuotaFija - interesMes;
    
    schedule.push({
      cuota: i + 1,
      capital: capitalMes,
      interes: interesMes,
      cuotaMensual: cuotaFija,
      saldoInsoluto: Math.max(0, saldoInsoluto - capitalMes)
    });
    
    // Actualizar saldo insoluto
    saldoInsoluto -= capitalMes;
  }
  
  return schedule;
};

// --- SERVICIOS DE BASE DE DATOS ---

// 1. Obtener todas las deudas del usuario con sus pagos
export const getUserDebts = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');

    const { data: debts, error: debtsError } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (debtsError) throw debtsError;

    const debtsWithPayments = await Promise.all(
      debts.map(async (debt) => {
        // Obtenemos los pagos con los nuevos campos (payment_method, receipt_url)
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('debt_id', debt.id)
          .order('date', { ascending: true });

        if (paymentsError) throw paymentsError;

        const nextPayment = payments.find(p => !p.paid);
        
        // Calcular tabla de amortización al vuelo
        const amortizationSchedule = calculateAmortizationSchedule(
          parseFloat(debt.principal),
          parseFloat(debt.interest_rate),
          debt.installments,
          debt.interest_period
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
          payments: payments.map(p => ({
            id: p.id,
            date: p.date,
            amount: parseFloat(p.amount),
            paid: p.paid,
            paidAt: p.paid_at,
            // Nuevos campos para el historial
            payment_method: p.payment_method,
            receipt_url: p.receipt_url
          })),
          nextPaymentDate: nextPayment?.date || null,
          amortizationSchedule 
        };
      })
    );

    return { success: true, data: debtsWithPayments };
  } catch (error) {
    console.error('Error obteniendo deudas:', error);
    return { success: false, error: error.message };
  }
};

// 2. Crear una nueva deuda con sus pagos
export const createDebt = async (debtData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');

    const { data: newDebt, error: debtError } = await supabase
      .from('debts')
      .insert([{
        user_id: user.id,
        name: debtData.name,
        lender: debtData.lender,
        total_amount: debtData.totalAmount,
        cuota: debtData.cuota,
        installments: debtData.installments,
        start_date: debtData.startDate,
        status: 'PENDIENTE',
        principal: debtData.principal,
        interest_rate: debtData.interestRate,
        interest_period: debtData.interestPeriod,
        total_interest: debtData.totalInterest,
      }])
      .select()
      .single();

    if (debtError) throw debtError;

    // Generar pagos
    const payments = [];
    for (let idx = 0; idx < debtData.installments; idx++) {
      const date = addMonths(new Date(debtData.startDate + 'T00:00:00'), idx + 1);
      payments.push({
        debt_id: newDebt.id,
        date: date.toISOString().split('T')[0],
        amount: debtData.cuota,
        paid: false
      });
    }

    const { data: createdPayments, error: paymentsError } = await supabase
      .from('payments')
      .insert(payments)
      .select();

    if (paymentsError) throw paymentsError;

    return { 
      success: true, 
      data: { ...newDebt, payments: createdPayments } 
    };
  } catch (error) {
    console.error('Error creando deuda:', error);
    return { success: false, error: error.message };
  }
};

// 3. NUEVO: Subir voucher/foto a Supabase Storage
export const uploadReceipt = async (file, userId) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Subir el archivo
    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Obtener la URL pública para guardarla en la base de datos
    const { data } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error subiendo comprobante:', error);
    return null;
  }
};

// 4. ACTUALIZADO: Marcar pago con método y recibo
export const markPaymentAsPaid = async (paymentId, method, receiptUrl = null) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .update({ 
        paid: true,
        paid_at: new Date().toISOString(),
        payment_method: method, // 'card', 'yape', 'cash'
        receipt_url: receiptUrl // URL de la foto o null
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // Verificar si se completó toda la deuda para cambiar el estado general
    const { data: payment } = await supabase
      .from('payments')
      .select('debt_id')
      .eq('id', paymentId)
      .single();

    if (payment) {
      const { data: allPayments } = await supabase
        .from('payments')
        .select('paid')
        .eq('debt_id', payment.debt_id);

      const allPaid = allPayments.every(p => p.paid);

      if (allPaid) {
        await supabase
          .from('debts')
          .update({ status: 'PAGADO' })
          .eq('id', payment.debt_id);
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error marcando pago:', error);
    return { success: false, error: error.message };
  }
};

// 5. Eliminar una deuda (y sus pagos por CASCADE)
export const deleteDebt = async (debtId) => {
  try {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error eliminando deuda:', error);
    return { success: false, error: error.message };
  }
};

// 6. Actualizar deuda con recálculo completo de cuotas
export const updateDebtWithPayments = async (debtId, updates) => {
  try {
    const cuotaNumerica = parseFloat(updates.cuota);
    const installmentsNumerica = parseInt(updates.installments);
    const totalAmountNumerica = parseFloat(updates.totalAmount);

    // a) Eliminar pagos antiguos (Requiere política DELETE en Supabase)
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('debt_id', debtId);

    if (deleteError) throw deleteError;
    
    // b) Actualizar datos de la deuda maestra
    const { data: updatedDebt, error: debtError } = await supabase
      .from('debts')
      .update({
        name: updates.name,
        lender: updates.lender,
        total_amount: totalAmountNumerica,
        cuota: cuotaNumerica,
        installments: installmentsNumerica,
        start_date: updates.startDate,
        principal: parseFloat(updates.principal || updates.totalAmount),
        interest_rate: parseFloat(updates.interestRate || 0),
        interest_period: updates.interestPeriod || 'unique',
        total_interest: parseFloat(updates.totalInterest || 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', debtId)
      .select()
      .single();

    if (debtError) throw debtError;

    // c) Crear nuevos pagos
    const newPayments = [];
    for (let idx = 0; idx < installmentsNumerica; idx++) {
      const date = addMonths(new Date(updates.startDate + 'T00:00:00'), idx + 1);
      newPayments.push({
        debt_id: debtId,
        date: date.toISOString().split('T')[0],
        amount: cuotaNumerica,
        paid: false,
        paid_at: null
      });
    }

    const { data: createdPayments, error: paymentsError } = await supabase
      .from('payments')
      .insert(newPayments)
      .select();

    if (paymentsError) throw paymentsError;

    return { 
      success: true, 
      data: { ...updatedDebt, payments: createdPayments } 
    };
  } catch (error) {
    console.error('Error actualizando deuda:', error);
    return { success: false, error: error.message };
  }
};

// 7. Actualizar una deuda (Simple, sin recalcular pagos)
export const updateDebt = async (debtId, updates) => {
  try {
    const { data, error } = await supabase
      .from('debts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', debtId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error actualizando deuda:', error);
    return { success: false, error: error.message };
  }
};