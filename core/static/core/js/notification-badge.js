async function updateNotificationBadge() {
    try {
        const response = await fetch('/api/notifications/unread_count/');
        const data = await response.json();
        const badge = document.getElementById('web-notification-badge');

        if (!badge) {
            return;
        }

        if (data.count > 0) {
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) {
        console.error('Не удалось проверить уведомления:', e);
    }
}

updateNotificationBadge();
setInterval(updateNotificationBadge, 30000);