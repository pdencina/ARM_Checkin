// Service Worker para Push Notifications — Play & Group
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "Play & Group";
  const options = {
    body: data.body || "Tienes una notificación",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || "play-notification",
    renotify: true,
    data: {
      url: data.url || "/play",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Al hacer click en la notificación, abrir la app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/play";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes("/play") && "focus" in client) {
          return client.focus();
        }
      }
      // Si no, abrir una nueva
      return clients.openWindow(url);
    })
  );
});

// Activar inmediatamente
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
