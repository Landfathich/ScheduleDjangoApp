async function updateNotificationBadge() {
    try {
        const response = await fetch('/api/notifications/unread_count/');
        const data = await response.json();
        const badge = document.getElementById('web-notification-badge');

        if (data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) {
        console.error('Не удалось получить количество уведомлений:', e);
    }
}

updateNotificationBadge();
setInterval(updateNotificationBadge, 30000);