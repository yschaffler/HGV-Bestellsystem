// Custom service worker extension — handles push notifications.
// This file is compiled and merged into the main PWA service worker by @ducanh2912/next-pwa.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "HGV Bestellsystem", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "HGV Bestellsystem", {
      body: data.body || "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: "printer-alert",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow("/settings/");
      })
  );
});
