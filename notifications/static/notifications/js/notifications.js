async function loadNotifications() {
    const resp = await fetch('/api/notifications/');
    const data = await resp.json();
    const container = document.getElementById('notifications-list');

    container.innerHTML = data.results.map(n => `
        <div class="notification-item ${n.is_read ? '' : 'unread'}">
            <strong>${n.title}</strong>
            <p>${n.body}</p>
            <small>${new Date(n.created_at).toLocaleString('ru')}</small>
        </div>
    `).join('');
}

document.getElementById('mark-all-read').addEventListener('click', async () => {
    await fetch('/api/notifications/mark_all_read/', {
        method: 'POST',
        headers: {'X-CSRFToken': getCookie('csrftoken')}
    });
    loadNotifications();
});

loadNotifications();