// src/services/debtServices.js
import { supabase } from '../supabaseClient';

// ✅ Función auxiliar para sumar meses correctamente
const addMonths = (date, months) => {
  const d = new Date(date);
  let month = d.getMonth() + months;
  let year = d.getFullYear();
  
  while (month > 11) {
    month -= 12;
    year += 1;
  }
  while (month < 0) {
    month += 12;
    year -= 1;
  }
  
  d.setFullYear(year);
  d.setMonth(month);
  
  return d;
};

// ✅ Obtener todas las deudas del usuario con sus pagos
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
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('debt_id', debt.id)
          .order('date', { ascending: true });

        if (paymentsError) throw paymentsError;

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
          interestPeriod: debt.interest_period,
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

    // Generar fechas correctamente
    const payments = [];
    for (let idx = 0; idx < debtData.installments; idx++) {
      const date = addMonths(new Date(debtData.startDate + 'T00:00:00'), idx);
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

// 🔥 ACTUALIZAR DEUDA CON RECÁLCULO DE CUOTAS (CORREGIDO - ELIMINA TODO)
export const updateDebtWithPayments = async (debtId, updates) => {
  try {
    console.log('📝 Iniciando actualización:', { debtId, updates });

    const cuotaNumerica = parseFloat(updates.cuota);
    const installmentsNumerica = parseInt(updates.installments);
    const totalAmountNumerica = parseFloat(updates.totalAmount);

    console.log('🔢 Valores numéricos:', { 
      cuota: cuotaNumerica, 
      installments: installmentsNumerica, 
      totalAmount: totalAmountNumerica 
    });

    // 1. Actualizar la deuda
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
    console.log('✅ Deuda actualizada en BD');

    // 🔥 2. ELIMINAR **TODOS** LOS PAGOS ANTIGUOS (sin importar si están pagados o no)
    console.log('🗑️ Eliminando TODOS los pagos antiguos...');
    
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('debt_id', debtId);

    if (deleteError) {
      console.error('❌ Error eliminando pagos:', deleteError);
      throw deleteError;
    }
    
    console.log('✅ Todos los pagos antiguos eliminados');

    // 3. CREAR nuevos pagos desde cero
    const newPayments = [];
    for (let idx = 0; idx < installmentsNumerica; idx++) {
      const date = addMonths(new Date(updates.startDate + 'T00:00:00'), idx);
      
      newPayments.push({
        debt_id: debtId,
        date: date.toISOString().split('T')[0],
        amount: cuotaNumerica,
        paid: false
      });
    }

    console.log('📋 Nuevos pagos a crear:', newPayments.length);

    const { data: createdPayments, error: paymentsError } = await supabase
      .from('payments')
      .insert(newPayments)
      .select();

    if (paymentsError) {
      console.error('❌ Error creando nuevos pagos:', paymentsError);
      throw paymentsError;
    }
    
    console.log('✅ Nuevos pagos generados:', createdPayments.length);

    return { 
      success: true, 
      data: {
        ...updatedDebt,
        payments: createdPayments
      } 
    };
  } catch (error) {
    console.error('❌ Error actualizando deuda:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Actualizar una deuda (versión antigua, sin recálculo)
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