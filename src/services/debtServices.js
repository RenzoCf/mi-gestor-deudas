// src/services/debtService.js
import { supabase } from '../supabaseClient';

// ✅ Obtener todas las deudas del usuario con sus pagos
export const getUserDebts = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener deudas
    const { data: debts, error: debtsError } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (debtsError) throw debtsError;

    // Obtener pagos para cada deuda
    const debtsWithPayments = await Promise.all(
      debts.map(async (debt) => {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('debt_id', debt.id)
          .order('date', { ascending: true });

        if (paymentsError) throw paymentsError;

        // Calcular siguiente pago
        const nextPayment = payments.find(p => !p.paid);
        
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
  payments: payments.map(p => ({
    id: p.id,
    date: p.date,
    amount: parseFloat(p.amount),
    paid: p.paid,
    paidAt: p.paid_at
  })),
  nextPaymentDate: nextPayment?.date || null
};
      })
    );

    return { success: true, data: debtsWithPayments };
  } catch (error) {
    console.error('❌ Error obteniendo deudas:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Crear una nueva deuda con sus pagos
export const createDebt = async (debtData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Crear la deuda
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
        total_interest: debtData.totalInterest,
      }])
      .select()
      .single();

    if (debtError) throw debtError;

    // 2. Crear los pagos
    const payments = Array.from({ length: debtData.installments }, (_, idx) => {
      const date = new Date(debtData.startDate + 'T00:00:00');
      date.setMonth(date.getMonth() + idx);
      
      return {
        debt_id: newDebt.id,
        date: date.toISOString().split('T')[0],
        amount: debtData.cuota,
        paid: false
      };
    });

    const { data: createdPayments, error: paymentsError } = await supabase
      .from('payments')
      .insert(payments)
      .select();

    if (paymentsError) throw paymentsError;

    console.log('✅ Deuda creada:', newDebt.id);

    return { 
      success: true, 
      data: {
        ...newDebt,
        payments: createdPayments
      } 
    };
  } catch (error) {
    console.error('❌ Error creando deuda:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Marcar un pago como pagado
export const markPaymentAsPaid = async (paymentId) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .update({ 
        paid: true,
        paid_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // Verificar si todas las cuotas están pagadas para actualizar status
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

    console.log('✅ Pago marcado como pagado');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error marcando pago:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Eliminar una deuda (y sus pagos por CASCADE)
export const deleteDebt = async (debtId) => {
  try {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId);

    if (error) throw error;

    console.log('✅ Deuda eliminada');
    return { success: true };
  } catch (error) {
    console.error('❌ Error eliminando deuda:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Actualizar una deuda
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

    console.log('✅ Deuda actualizada');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error actualizando deuda:', error);
    return { success: false, error: error.message };
  }
};