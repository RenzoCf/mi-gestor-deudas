import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export default async function handler(req, res) {
  try {
    // 1. CARGAR CREDENCIALES (Vienen de Vercel)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    // Validación de seguridad
    if (!supabaseUrl || !supabaseKey || !twilioSid || !twilioToken || !twilioPhone) {
      throw new Error('Faltan credenciales de entorno (Supabase o Twilio)');
    }

    // 2. INICIALIZAR CLIENTES
    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = twilio(twilioSid, twilioToken);

    // 3. FECHA PERÚ (UTC-5)
    const peruTime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000));
    const today = peruTime.toISOString().split('T')[0];

    console.log(`🤖 [Twilio Bot] Iniciando revisión para: ${today}`);

    // 4. BUSCAR DEUDAS QUE VENCEN HOY (Y NO PAGADAS)
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        amount,
        debts (
          name,
          lender,
          user_id
        )
      `)
      .eq('date', today)
      .eq('paid', false);

    if (error) throw error;

    if (!payments || payments.length === 0) {
      console.log('✅ Todo tranquilo, nadie debe nada hoy.');
      return res.status(200).json({ status: 'Sin vencimientos hoy' });
    }

    // 5. AGRUPAR MENSAJES POR USUARIO
    // (Para no enviar 5 SMS si tienes 5 deudas, mejor 1 SMS resumen)
    const notifications = {};

    for (const p of payments) {
      const userId = p.debts.user_id;
      
      // Si es el primer hallazgo de este usuario, buscamos su info
      if (!notifications[userId]) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone, full_name')
          .eq('id', userId)
          .single();
        
        // Solo procedemos si tiene celular configurado
        if (profile && profile.phone) {
          notifications[userId] = {
            phone: profile.phone, // El número del usuario (+51...)
            name: profile.full_name || 'Usuario',
            debts: []
          };
        }
      }

      // Agregamos la deuda a su lista
      if (notifications[userId]) {
        notifications[userId].debts.push(
          `${p.debts.name}: S/ ${p.amount.toFixed(2)}`
        );
      }
    }

    // 6. ENVIAR LOS SMS CON TWILIO
    let sentCount = 0;
    let errorCount = 0;
    
    // Recorremos cada usuario con deudas hoy
    for (const userId in notifications) {
      const user = notifications[userId];
      
      // Mensaje SMS corto y efectivo
      const messageBody = `Hola ${user.name.split(' ')[0]}, hoy vencen tus pagos en FinanzasEdu: ${user.debts.join(', ')}. Evita moras pagando aquí: https://mi-gestor-deudas.vercel.app`;
      
      try {
        await client.messages.create({
          body: messageBody,
          from: twilioPhone, // Tu número Twilio (+1...)
          to: user.phone     // El número del usuario (+51...)
        });
        
        console.log(`✅ SMS enviado a ${user.phone}`);
        sentCount++;
      } catch (e) {
        console.error(`❌ Error Twilio con ${user.phone}:`, e.message);
        errorCount++;
      }
    }

    return res.status(200).json({ 
      status: 'Proceso finalizado', 
      enviados: sentCount,
      errores: errorCount
    });

  } catch (err) {
    console.error('🔥 Error Crítico:', err.message);
    return res.status(500).json({ error: err.message });
  }
}