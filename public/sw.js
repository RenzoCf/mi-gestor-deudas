// renzocf/mi-gestor-deudas/mi-gestor-deudas-1bcd36dc9f1cded5c409edb60dffca9905c4cf0f/public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/vite.svg', // O tu logo (ej: /logo.png)
    badge: '/vite.svg', // Icono pequeño para la barra de estado
    data: {
      url: data.url || '/' // A donde ir al hacer click
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});