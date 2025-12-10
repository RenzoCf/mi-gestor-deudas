import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push'; 

export default async function handler(req, res) {
  try {
    // 1. CARGAR CREDENCIALES
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Credenciales VAPID para Web Push
    const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = 'mailto:tu-email@ejemplo.com'; // Requerido por el estándar

    if (!supabaseUrl || !supabaseKey || !vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Faltan credenciales VAPID o Supabase');
    }

    // 2. CONFIGURAR WEB PUSH
    webpush.setVapidDetails(
      vapidEmail,
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseKey);
    // Ajustar a la zona horaria de Perú (-5 horas UTC)
    const peruTime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000));
    const today = peruTime.toISOString().split('T')[0];

    console.log(`🤖 [Push Bot] Revisando pagos vencidos hasta: ${today}`);

    // 3. BUSCAR PAGOS VENCIDOS Y DE HOY
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        amount,
        debts (name, user_id)
      `)
      .lte('date', today) // 🔥 CORRECCIÓN: Busca todas las deudas vencidas hasta hoy.
      .eq('paid', false);

    if (error) throw error;
    if (!payments || payments.length === 0) {
      return res.status(200).json({ status: 'Sin vencimientos pendientes hoy o antes' });
    }

    // 4. AGRUPAR Y NOTIFICAR
    const notificationsToSend = {};

    // Agrupamos deudas por usuario
    payments.forEach(p => {
        const uid = p.debts.user_id;
        if (!notificationsToSend[uid]) notificationsToSend[uid] = [];
        notificationsToSend[uid].push(`${p.debts.name} (S/ ${p.amount})`);
    });

    let sentCount = 0;
    let errorCount = 0;

    // Procesamos cada usuario
    for (const userId in notificationsToSend) {
        // Obtenemos TODAS las suscripciones (dispositivos) de ese usuario
        const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', userId);
        
        if (subscriptions && subscriptions.length > 0) {
            const debtsList = notificationsToSend[userId].join(', ');
            
            // 🔥 CORRECCIÓN DE MENSAJE Y URL
            const payload = JSON.stringify({
                title: '¡Recordatorio de Deuda!', // Título más general
                body: `Tienes pagos pendientes vencidos o con vencimiento hoy: ${debtsList}. Entra a pagar.`, 
                url: 'https://[TU-NOMBRE-DE-PROYECTO].vercel.app/dashboard' // ¡CORREGIR CON TU URL REAL!
            });

            // Enviamos a todos los dispositivos del usuario (PC, Celular, etc)
            for (const subRecord of subscriptions) {
                try {
                    await webpush.sendNotification(subRecord.subscription, payload);
                    sentCount++;
                } catch (err) {
                    console.error('Error enviando push:', err);
                    
                    // CORRECCIÓN: Si da error 410 (Gone), eliminar suscripción
                    if (err.statusCode === 410) {
                        const endpoint = subRecord.subscription.endpoint; 
                        if (endpoint) {
                           await supabase
                              .from('push_subscriptions')
                              .delete()
                              .eq('subscription->>endpoint', endpoint); 
                           console.log(`Suscripción eliminada (endpoint: ${endpoint})`);
                        }
                    }
                    errorCount++;
                }
            }
        }
    }

    return res.status(200).json({ 
      status: 'Proceso Push finalizado', 
      enviados: sentCount,
      errores: errorCount
    });

  } catch (err) {
    console.error('🔥 Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}