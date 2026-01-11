self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || "/web-app-manifest-192x192.png",
    badge: data.badge || "/web-app-manifest-192x192.png",
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url: data.url || "/",
      ...data.data,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || "Notifikasi", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
