import { supabase } from '../supabaseClient';

// Tu llave pública generada en el paso 0 (Pégala aquí o usa variable de entorno)
const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY; 

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushNotification(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('Push notifications no soportadas');
    return false;
  }

  try {
    // 1. Registrar el Service Worker
    const register = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    // 2. Esperar a que esté listo
    await navigator.serviceWorker.ready;

    // 3. Suscribirse al PushManager del navegador
    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });

    // 4. Guardar la suscripción en Supabase
    // Primero revisamos si ya existe para no duplicar
    
    // 🔥 CORRECCIÓN AQUÍ: Cambiamos 'subscription->endpoint' a 'subscription->>endpoint'
    const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('subscription->>endpoint', subscription.endpoint) // Usamos ->> para extraer el texto correctamente
        .single();

    if (!existing) {
        await supabase.from('push_subscriptions').insert({
            user_id: userId,
            subscription: subscription
        });
        console.log('✅ Suscripción Push guardada en BD');
    }
    
    return true;

  } catch (error) {
    console.error('Error al registrar Push:', error);
    return false;
  }
}