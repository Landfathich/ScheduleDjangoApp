async function updateNotificationBadge() {
    try {
        const response = await fetch('/api/notifications/unread_count/');
        const data = await response.json();
        const badge = document.getElementById('notification-badge');
        if (data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) {}
}

document.getElementById('notification-bell').addEventListener('click', () => {
    window.location.href = '/notifications/';
});

updateNotificationBadge();
setInterval(updateNotificationBadge, 30000);