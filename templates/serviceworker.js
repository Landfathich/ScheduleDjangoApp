self.addEventListener('push', function (event) {
    if (!event.data) return;
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'Kodama Chat', {
            body: data.body || 'Новое сообщение',
            icon: '/static/core/images/icons/ic_launcher_160x160.png',
            data: {url: data.url || '/chat/'}
        })
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});